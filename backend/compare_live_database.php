<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

function getTableStructure(string $sql): array
{
    preg_match_all('/CREATE TABLE `([^`]+)` \((.*?)\) ENGINE=/s', $sql, $matches);
    $tables = [];

    foreach ($matches[1] as $index => $tableName) {
        $content = trim($matches[2][$index]);
        $lines = explode(",\n", $content);
        $columns = [];
        $constraints = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (strpos($line, 'PRIMARY KEY') === 0 || strpos($line, 'KEY') === 0 || strpos($line, 'UNIQUE KEY') === 0 || strpos($line, 'CONSTRAINT') === 0) {
                $constraints[] = $line;
            } else {
                if (preg_match('/^`([^`]+)` (.*)$/', $line, $colMatch)) {
                    $columns[$colMatch[1]] = trim($colMatch[2]);
                }
            }
        }

        $tables[$tableName] = [
            'columns' => $columns,
            'constraints' => $constraints,
        ];
    }

    return $tables;
}

$schemaFilePath = __DIR__.'/live_database_schema.sql';
if (!file_exists($schemaFilePath)) {
    echo "File live_database_schema.sql not found.\n";
    exit(1);
}

$schemaSql = file_get_contents($schemaFilePath);
$fileSchema = getTableStructure($schemaSql);

$rows = DB::select('SHOW TABLES');
$tableNames = [];
foreach ($rows as $row) {
    $rowArr = (array)$row;
    $tableNames[] = reset($rowArr);
}

$dbSql = '';
foreach ($tableNames as $table) {
    $res = DB::select("SHOW CREATE TABLE `$table`");
    $create = null;
    if (isset($res[0]->{'Create Table'})) {
        $create = $res[0]->{'Create Table'};
    } elseif (isset($res[0]['Create Table'])) {
        $create = $res[0]['Create Table'];
    }
    if ($create) {
        $dbSql .= $create . "\n\n";
    }
}

$dbSchema = getTableStructure($dbSql);
$allTables = array_unique(array_merge(array_keys($fileSchema), array_keys($dbSchema)));
$changes = [];

foreach ($allTables as $table) {
    if (!isset($fileSchema[$table])) {
        $changes[] = "-- Table $table exists in live DB but not in live_database_schema.sql";
        continue;
    }
    if (!isset($dbSchema[$table])) {
        $changes[] = "-- Table $table exists in live_database_schema.sql but not in live DB";
        continue;
    }

    $fileCols = $fileSchema[$table]['columns'];
    $liveCols = $dbSchema[$table]['columns'];

    foreach ($liveCols as $col => $def) {
        if (!isset($fileCols[$col])) {
            $changes[] = "ALTER TABLE `$table` ADD COLUMN `$col` $def; -- Added in live DB";
        } elseif ($fileCols[$col] !== $def) {
            $changes[] = "-- Column $col in $table differs:";
            $changes[] = "-- Live DB: $def";
            $changes[] = "-- File: {$fileCols[$col]}";
        }
    }

    foreach ($fileCols as $col => $def) {
        if (!isset($liveCols[$col])) {
            $changes[] = "-- Column $col exists in live_database_schema.sql but MISSING in live DB table `$table`";
        }
    }
}

$outputFile = __DIR__ . '/db_live_diff.sql';
file_put_contents($outputFile, implode("\n", $changes));
echo "Wrote $outputFile with " . count($changes) . " diff lines.\n";
