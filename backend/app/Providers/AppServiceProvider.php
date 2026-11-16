<?php

namespace App\Providers;

use App\Mail\Transports\SendGridTransport;
use Illuminate\Mail\MailManager;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;
use App\Models\PersonalAccessToken;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        $this->app->resolving(MailManager::class, function (MailManager $manager) {
            $manager->extend('sendgrid', function (array $config) {
                $apiKey = $config['api_key'] ?? config('services.sendgrid.key');

                if (empty($apiKey)) {
                    throw new \InvalidArgumentException('SendGrid API key is required.');
                }

                $dispatcher = null;
                $logger = null;

                try {
                    if ($this->app->bound(\Psr\EventDispatcher\EventDispatcherInterface::class)) {
                        $dispatcher = $this->app->make(\Psr\EventDispatcher\EventDispatcherInterface::class);
                    }
                } catch (\Exception $e) {}

                try {
                    if ($this->app->bound(\Psr\Log\LoggerInterface::class)) {
                        $logger = $this->app->make(\Psr\Log\LoggerInterface::class);
                    }
                } catch (\Exception $e) {}

                return new SendGridTransport($apiKey, $dispatcher, $logger);
            });
        });
    }
}
