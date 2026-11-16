<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$output = '';
$tables = DB::select('SHOW TABLES');
foreach ($tables as $table) {
    $tableName = current($table);
    $output .= "\n-- Table: $tableName\n";
    $create = DB::select("SHOW CREATE TABLE `$tableName`")[0];
    $output .= $create->{'Create Table'} . ";\n";
}
file_put_contents('live_database_schema.sql', $output);
echo "Schema exported to live_database_schema.sql\n";
