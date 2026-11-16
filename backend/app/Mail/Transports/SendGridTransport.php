<?php

namespace App\Mail\Transports;

use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;
use Symfony\Component\Mime\Email;

class SendGridTransport extends AbstractTransport
{
    protected $apiKey;
    protected $endpoint = 'https://api.sendgrid.com/v3/mail/send';

    public function __construct(string $apiKey, ?EventDispatcherInterface $dispatcher = null, ?LoggerInterface $logger = null)
    {
        parent::__construct($dispatcher, $logger);
        $this->apiKey = $apiKey;
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $this->sendViaCurl($this->buildPayload($email));
    }

    protected function buildPayload(Email $email): array
    {
        $payload = [
            'personalizations' => [
                ['to' => $this->formatAddresses($email->getTo())],
            ],
            'from'    => $this->formatAddress($email->getFrom()[0]),
            'subject' => $email->getSubject(),
        ];

        if (count($email->getCc()) > 0) {
            $payload['personalizations'][0]['cc'] = $this->formatAddresses($email->getCc());
        }
        if (count($email->getBcc()) > 0) {
            $payload['personalizations'][0]['bcc'] = $this->formatAddresses($email->getBcc());
        }
        if (count($email->getReplyTo()) > 0) {
            $payload['reply_to'] = $this->formatAddress($email->getReplyTo()[0]);
        }

        $content = [];
        if ($email->getTextBody()) {
            $content[] = ['type' => 'text/plain', 'value' => $email->getTextBody()];
        }
        if ($email->getHtmlBody()) {
            $content[] = ['type' => 'text/html',  'value' => $email->getHtmlBody()];
        }
        if (!empty($content)) {
            $payload['content'] = $content;
        }

        $attachments = $this->formatAttachments($email);
        if (!empty($attachments)) {
            $payload['attachments'] = $attachments;
        }

        return $payload;
    }

    protected function formatAddresses(array $addresses): array
    {
        return array_map(fn($a) => $this->formatAddress($a), $addresses);
    }

    protected function formatAddress($address): array
    {
        $out = ['email' => $address->getAddress()];
        if ($address->getName()) {
            $out['name'] = $address->getName();
        }
        return $out;
    }

    protected function formatAttachments(Email $email): array
    {
        $attachments = [];
        foreach ($email->getAttachments() as $attachment) {
            $headers = $attachment->getPreparedHeaders();
            $disposition = $headers->getHeaderBody('Content-Disposition');
            preg_match('/filename="(.+)"/', $disposition, $matches);
            $attachments[] = [
                'content'     => base64_encode($attachment->getBody()),
                'filename'    => $matches[1] ?? 'attachment',
                'type'        => $headers->getHeaderBody('Content-Type'),
                'disposition' => 'attachment',
            ];
        }
        return $attachments;
    }

    protected function sendViaCurl(array $payload): void
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $this->endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \RuntimeException('SendGrid cURL Error: ' . $error);
        }

        if ($httpCode >= 400) {
            $data = json_decode($response, true);
            $msg  = isset($data['errors']) ? json_encode($data['errors']) : $response;
            throw new \RuntimeException('SendGrid API Error: ' . $msg . ' (HTTP ' . $httpCode . ')');
        }
    }

    public function __toString(): string
    {
        return 'sendgrid';
    }
}
