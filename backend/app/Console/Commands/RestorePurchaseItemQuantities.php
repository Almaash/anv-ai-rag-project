<?php

namespace App\Console\Commands;

use App\Models\Inventory\InventorySale;
use App\Models\Inventory\PurchaseItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RestorePurchaseItemQuantities extends Command
{
    protected $signature = 'inventory:restore-purchase-quantities';
    protected $description = 'Restore PurchaseItem.quantity values that were incorrectly decremented by loan product orders. Run once after deploying the fix.';

    public function handle(): int
    {
        // Find all loan_product_order sales grouped by purchase_item_id
        $sales = InventorySale::query()
            ->where('sale_source', 'loan_product_order')
            ->select('purchase_item_id', DB::raw('SUM(quantity) as total_sold'))
            ->groupBy('purchase_item_id')
            ->get();

        if ($sales->isEmpty()) {
            $this->info('No loan product order sales found. Nothing to restore.');
            return 0;
        }

        $restored = 0;
        foreach ($sales as $sale) {
            $rawId = (string) $sale->purchase_item_id;
            // Resolve to integer ID (handles both "INV-PI-000001" and raw integer)
            $numericId = preg_match('/^INV-PI-(\d+)$/', $rawId, $m) ? (int) $m[1] : (ctype_digit($rawId) ? (int) $rawId : null);
            if (!$numericId) {
                $this->warn("Could not resolve purchase_item_id: {$rawId}");
                continue;
            }

            $item = PurchaseItem::find($numericId);
            if (!$item) {
                $this->warn("PurchaseItem #{$numericId} not found.");
                continue;
            }

            $item->increment('quantity', (float) $sale->total_sold);
            $this->line("Restored PurchaseItem #{$numericId} quantity +{$sale->total_sold}");
            $restored++;
        }

        $this->info("Done. Restored {$restored} purchase item(s).");
        return 0;
    }
}
