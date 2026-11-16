<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->use([
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\ParseError $e, $request) {
            if ($request->is('api/*')) {
                \Log::error('Parse error: ' . $e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
                return response()->json([
                    'success' => false,
                    'message' => 'Server configuration error',
                    'error' => 'There is a syntax error in the server code. Please contact support.'
                ], 500);
            }
        });
        
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            }
        });
        
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Resource not found',
                    'error' => 'The requested resource does not exist'
                ], 404);
            }
        });
        
        $exceptions->render(function (\Illuminate\Database\QueryException $e, $request) {
            if ($request->is('api/*')) {
                \Log::error('Database error: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Database error',
                    'error' => 'A database error occurred. Please try again later.'
                ], 500);
            }
        });
        
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                    'error' => 'Authentication required'
                ], 401);
            }
        });
        
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Route not found',
                    'error' => 'The requested API endpoint does not exist'
                ], 404);
            }
        });
        
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Method not allowed',
                    'error' => 'The HTTP method is not supported for this endpoint'
                ], 405);
            }
        });
        
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*')) {
                \Log::error('Unexpected error: ' . $e->getMessage(), [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Internal server error',
                    'error' => 'An unexpected error occurred. Please try again later.'
                ], 500);
            }
        });
    })->create();
