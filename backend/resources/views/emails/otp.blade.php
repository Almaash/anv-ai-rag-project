<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

          {{-- Header --}}
          <tr>
            <td style="background:#4f46e5;padding:28px 36px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                Anavran Livelihood
              </p>
            </td>
          </tr>

          {{-- Body --}}
          <tr>
            <td style="padding:36px 36px 28px;">

              <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#0f172a;">
                Your OTP Code
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">
                Use this code to verify your email address.
              </p>

              {{-- OTP --}}
              <div style="background:#f8fafc;border:2px dashed #c7d2fe;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#4f46e5;">
                  {{ $otp }}
                </span>
              </div>

              <p style="margin:0 0 28px;font-size:13px;color:#94a3b8;text-align:center;">
                Valid for <strong style="color:#475569;">10 minutes</strong> &nbsp;·&nbsp; Do not share this code
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;" />

              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Didn't request this? Simply ignore this email.
              </p>

            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="background:#f8fafc;padding:16px 36px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © {{ date('Y') }} Anavran Livelihood Pvt Ltd
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
