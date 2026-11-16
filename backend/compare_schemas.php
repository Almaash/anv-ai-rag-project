<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

function getTableStructure($sql) {
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
                // Approximate column parsing
                if (preg_match('/^`([^`]+)` (.*)$/', $line, $colMatch)) {
                    $columns[$colMatch[1]] = trim($colMatch[2]);
                }
            }
        }
        $tables[$tableName] = [
            'columns' => $columns,
            'constraints' => $constraints
        ];
    }
    return $tables;
}

$fileSql = file_get_contents('database_schema.sql');
$liveSql = file_get_contents('live_database_schema.sql');

$fileSchema = getTableStructure($fileSql);
$liveSchema = getTableStructure($liveSql);

$allTables = array_unique(array_merge(array_keys($fileSchema), array_keys($liveSchema)));
$changes = [];

foreach ($allTables as $table) {
    if (!isset($fileSchema[$table])) {
        $changes[] = "-- Table $table exists in live DB but not in database_schema.sql";
        continue;
    }
    if (!isset($liveSchema[$table])) {
        $changes[] = "-- Table $table exists in database_schema.sql but not in live DB";
        continue;
    }

    $fileCols = $fileSchema[$table]['columns'];
    $liveCols = $liveSchema[$table]['columns'];

    foreach ($liveCols as $col => $def) {
        if (!isset($fileCols[$col])) {
            $changes[] = "ALTER TABLE `$table` ADD COLUMN `$col` $def; -- Added in live";
        } elseif ($fileCols[$col] !== $def) {
             // Basic comparison (ignoring some minor differences might be better but let's be strict first)
             // SQL definitions can vary slightly in formatting, so this might have false positives
             $changes[] = "-- Column $col in $table differs:\n-- Live: $def\n-- File: {$fileCols[$col]}";
        }
    }

    foreach ($fileCols as $col => $def) {
        if (!isset($liveCols[$col])) {
            $changes[] = "-- Column $col exists in database_schema.sql but MISSING in live table `$table`";
        }
    }
}

file_put_contents('db_changes_diff.sql', implode("\n", $changes));
echo "Comparison complete. Results in db_changes_diff.sql\n";
