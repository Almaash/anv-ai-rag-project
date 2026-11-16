<?php
/**
 * generate_diff.php
 * Compares LOCAL running DB (anavaran_db) vs live_database_schema.sql
 * Outputs db_live_diff.sql with only what's MISSING on live (needs to be applied to live)
 */
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Parse CREATE TABLE statements into structured array
function parseSchema(string $sql): array
{
    preg_match_all('/CREATE TABLE `([^`]+)` \((.*?)\) ENGINE=/s', $sql, $matches);
    $tables = [];
    foreach ($matches[1] as $i => $table) {
        $lines = preg_split('/,\s*\n/', trim($matches[2][$i]));
        $columns = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if (preg_match('/^`([^`]+)`\s+(.+)$/', $line, $m)) {
                $columns[$m[1]] = normalise($m[2]);
            }
        }
        $tables[$table] = $columns;
    }
    return $tables;
}

// Strip AUTO_INCREMENT counters and minor formatting noise for comparison
function normalise(string $def): string
{
    $def = preg_replace('/AUTO_INCREMENT=\d+\s*/i', '', $def);
    $def = preg_replace('/\s+/', ' ', trim($def));
    return $def;
}

// --- Build LOCAL schema from running DB ---
$rows = DB::select('SHOW TABLES');
$localSql = '';
foreach ($rows as $row) {
    $arr = (array)$row; $t = reset($arr);
    $res = DB::select("SHOW CREATE TABLE `$t`");
    $create = $res[0]->{'Create Table'} ?? '';
    if ($create) $localSql .= $create . "\n\n";
}

// --- Load LIVE schema from file ---
$liveFile = __DIR__ . '/live_database_schema.sql';
$liveSql = file_get_contents($liveFile);

$localSchema = parseSchema($localSql);
$liveSchema  = parseSchema($liveSql);

$lines = [];
$lines[] = "-- ============================================================";
$lines[] = "-- db_live_diff.sql";
$lines[] = "-- Generated: " . date('Y-m-d H:i:s');
$lines[] = "-- Direction: Changes in LOCAL DB that are MISSING on LIVE";
$lines[] = "-- Apply this file on the LIVE server to bring it up to date";
$lines[] = "-- ============================================================";
$lines[] = "";

// 1. Tables in local but missing on live → CREATE TABLE
foreach ($localSchema as $table => $cols) {
    if (!isset($liveSchema[$table])) {
        $lines[] = "-- TABLE MISSING ON LIVE: $table";
        // Get the full CREATE TABLE from local DB
        $res = DB::select("SHOW CREATE TABLE `$table`");
        $create = $res[0]->{'Create Table'} ?? '';
        if ($create) {
            $lines[] = $create . ";";
            $lines[] = "";
        }
    }
}

// 2. Tables in live but missing locally (dropped locally → warn only)
foreach ($liveSchema as $table => $cols) {
    if (!isset($localSchema[$table])) {
        $lines[] = "-- WARNING: Table `$table` exists on LIVE but not in local DB (dropped locally?)";
        $lines[] = "";
    }
}

// 3. Column-level diffs for tables that exist in both
foreach ($localSchema as $table => $localCols) {
    if (!isset($liveSchema[$table])) continue;
    $liveCols = $liveSchema[$table];
    $tableDiffs = [];

    // Columns in local but missing on live
    foreach ($localCols as $col => $def) {
        if (!isset($liveCols[$col])) {
            $tableDiffs[] = "ALTER TABLE `$table` ADD COLUMN `$col` $def; -- MISSING on live";
        } elseif ($liveCols[$col] !== $def) {
            $tableDiffs[] = "-- COLUMN DIFFERS in `$table`.`$col`:";
            $tableDiffs[] = "--   LOCAL : $def";
            $tableDiffs[] = "--   LIVE  : " . $liveCols[$col];
            $tableDiffs[] = "-- ALTER TABLE `$table` MODIFY COLUMN `$col` $def;";
        }
    }

    // Columns on live but missing in local (dropped locally → warn)
    foreach ($liveCols as $col => $def) {
        if (!isset($localCols[$col])) {
            $tableDiffs[] = "-- WARNING: Column `$col` exists on LIVE `$table` but not in local (dropped locally?)";
        }
    }

    if ($tableDiffs) {
        $lines[] = "-- ------------------------------------------------------------";
        $lines[] = "-- TABLE: $table";
        $lines[] = "-- ------------------------------------------------------------";
        foreach ($tableDiffs as $l) $lines[] = $l;
        $lines[] = "";
    }
}

$output = implode("\n", $lines);
file_put_contents(__DIR__ . '/db_live_diff.sql', $output);
echo "Done. db_live_diff.sql written.\n";
