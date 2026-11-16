<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\TransactionRequest;
use App\Models\Finance\FinanceTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FinanceTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = FinanceTransaction::with('creator')
                ->when($request->from_date, fn($q) => $q->whereDate('transaction_date', '>=', $request->from_date))
                ->when($request->to_date, fn($q) => $q->whereDate('transaction_date', '<=', $request->to_date))
                ->when($request->transaction_type, fn($q) => $q->where('transaction_type', $request->transaction_type))
                ->when($request->payment_mode, fn($q) => $q->where('payment_mode', $request->payment_mode))
                ->when($request->search, fn($q) => $q->where('transaction_id', 'like', '%' . $request->search . '%'))
                ->when($request->min_amount, fn($q) => $q->where('amount', '>=', $request->min_amount))
                ->when($request->max_amount, fn($q) => $q->where('amount', '<=', $request->max_amount))
                ->orderBy('transaction_date', 'desc')
                ->orderBy('id', 'desc');

            $perPage = $request->per_page ?? 15;
            $transactions = $query->paginate($perPage);

            // Append attachment_url to each item
            $transactions->getCollection()->transform(fn($t) => $this->appendAttachmentUrl($t));

            return response()->json([
                'success' => true,
                'message' => 'Transactions retrieved successfully',
                'data'    => $transactions,
            ]);
        } catch (\Exception $e) {
            Log::error('Finance index error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to retrieve transactions'], 500);
        }
    }

    public function store(TransactionRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $data['created_by'] = Auth::id();

            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $filename = time() . '_finance_attachment_' . $file->getClientOriginalName();
                $destinationPath = public_path('finance_attachments');
                if (!is_dir($destinationPath)) {
                    mkdir($destinationPath, 0755, true);
                }
                $file->move($destinationPath, $filename);
                $data['attachment'] = 'finance_attachments/' . $filename;
            }

            $transaction = FinanceTransaction::create($data);
            $transaction->load('creator');

            return response()->json([
                'success' => true,
                'message' => 'Transaction created successfully',
                'data'    => $this->appendAttachmentUrl($transaction),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Finance store error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to create transaction: ' . $e->getMessage()], 500);
        }
    }

    public function show($id): JsonResponse
    {
        $transaction = FinanceTransaction::with('creator')
            ->where(fn($q) => $q->where('id', $id)->orWhere('transaction_id', $id))
            ->first();

        if (!$transaction) {
            return response()->json(['success' => false, 'message' => 'Transaction not found'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Transaction retrieved successfully',
            'data'    => $this->appendAttachmentUrl($transaction),
        ]);
    }

    public function update(TransactionRequest $request, $id): JsonResponse
    {
        try {
            $transaction = FinanceTransaction::find($id);

            if (!$transaction) {
                return response()->json(['success' => false, 'message' => 'Transaction not found'], 404);
            }

            $data = $request->validated();

            if ($request->hasFile('attachment')) {
                // Delete old file from public folder
                if ($transaction->attachment) {
                    $oldPath = public_path($transaction->attachment);
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }
                }
                $file = $request->file('attachment');
                $filename = time() . '_finance_attachment_' . $file->getClientOriginalName();
                $destinationPath = public_path('finance_attachments');
                if (!is_dir($destinationPath)) {
                    mkdir($destinationPath, 0755, true);
                }
                $file->move($destinationPath, $filename);
                $data['attachment'] = 'finance_attachments/' . $filename;
            }

            $transaction->update($data);
            $transaction->load('creator');

            return response()->json([
                'success' => true,
                'message' => 'Transaction updated successfully',
                'data'    => $this->appendAttachmentUrl($transaction),
            ]);
        } catch (\Exception $e) {
            Log::error('Finance update error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update transaction'], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $transaction = FinanceTransaction::find($id);

            if (!$transaction) {
                return response()->json(['success' => false, 'message' => 'Transaction not found'], 404);
            }

            $transaction->delete();

            return response()->json([
                'success' => true,
                'message' => 'Transaction deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Finance destroy error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to delete transaction'], 500);
        }
    }

    public function downloadAttachment($id): mixed
    {
        $transaction = FinanceTransaction::find($id);

        if (!$transaction || !$transaction->attachment) {
            return response()->json(['success' => false, 'message' => 'Attachment not found'], 404);
        }

        $path = public_path($transaction->attachment);

        if (!file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'File not found on disk'], 404);
        }

        return response()->download($path);
    }

    private function appendAttachmentUrl(FinanceTransaction $transaction): FinanceTransaction
    {
        if ($transaction->attachment) {
            // Build URL same way as all other modules: APP_URL + '/' + relative_path
            $transaction->attachment_url = url($transaction->attachment);
        } else {
            $transaction->attachment_url = null;
        }

        if ($transaction->relationLoaded('creator') && $transaction->creator) {
            $transaction->creator->makeHidden('id');
        }

        return $transaction;
    }
}
