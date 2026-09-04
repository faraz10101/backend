const { Resend } = require('resend');

// Load from environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate 6-digit verification code
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP verification email
 * @param {string} email - User email
 * @param {string} code - 6-digit code
 * @returns {Promise<{code, success}>}
 */
async function sendOTPEmail(email, code) {
    try {
        if (!email || !code) {
            throw new Error('Email and code are required');
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f5f5f5;
                  }
                  .container {
                    max-width: 500px;
                    margin: 40px auto;
                    background-color: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                  }
                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                  }
                  .content {
                    padding: 40px 30px;
                  }
                  .welcome {
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 20px;
                    line-height: 1.6;
                    text-align: center;
                  }
                  .code-box {
                    background-color: #f9f9f9;
                    border: 2px solid #667eea;
                    border-radius: 10px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: center;
                  }
                  .code-label {
                    font-size: 13px;
                    color: #999;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                  }
                  .code {
                    font-size: 48px;
                    font-weight: 800;
                    color: #667eea;
                    letter-spacing: 10px;
                    font-family: 'Monaco', 'Courier New', monospace;
                    word-break: break-all;
                  }
                  .expiry {
                    font-size: 13px;
                    color: #f59e0b;
                    margin-top: 15px;
                    font-weight: 600;
                  }
                  .security-note {
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 6px;
                    font-size: 13px;
                    color: #92400e;
                  }
                  .security-note strong {
                    display: block;
                    margin-bottom: 5px;
                  }
                  .footer {
                    background-color: #f9f9f9;
                    padding: 20px;
                    text-align: center;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #999;
                  }
                  @media (max-width: 600px) {
                    .container { margin: 20px; }
                    .header { padding: 20px; }
                    .header h1 { font-size: 22px; }
                    .content { padding: 25px 20px; }
                    .code { font-size: 36px; letter-spacing: 6px; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Relic</h1>
                  </div>
                  
                  <div class="content">
                    <p class="welcome">Welcome to Relic!</p>
                    
                    <p style="color: #666; margin-bottom: 20px; text-align: center; font-size: 14px;">
                      Please enter the verification code below to verify your email address.
                    </p>
                    
                    <div class="code-box">
                      <div class="code-label">Verification Code</div>
                      <div class="code">${code}</div>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 14px; margin: 20px 0;">
                      <p>This code is valid for <strong>1 minute only</strong>.</p>
                    </div>
                    
                    <div class="security-note">
                      <strong>Security Notice:</strong> If you did not request this code, please ignore this email. Never share this code with anyone. We will never ask for your verification code via email.
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>© 2024 Relic. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                  </div>
                </div>
              </body>
            </html>
        `;

        // Send email with Resend
        const response = await resend.emails.send({
            from: 'Relic <noreplya.relic@codeera.me>',
            to: email,
            subject: 'Verify Your Email - Relic',
            html: htmlContent,
        });

        console.log('Email sent successfully:', {
            code,
            email,
            messageId: response.id
        });

        return {
            success: true,
            code,
            email,
            messageId: response.id
        };

    } catch (error) {
        console.error('Error sending email:', error);
        
        // Proper error messages
        if (error.message.includes('Invalid "from"')) {
            throw new Error('Email domain not verified in Resend. Contact admin.');
        }
        
        if (error.message.includes('API key')) {
            throw new Error('Resend API key invalid or expired.');
        }
        
        throw new Error(`Failed to send email: ${error.message}`);
    }
}


/**
 * Send password reset email (ready to use)
 */
async function sendPasswordResetEmail(email, resetLink) {
    try {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f5f5f5;
                  }
                  .container {
                    max-width: 500px;
                    margin: 40px auto;
                    background-color: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                  }
                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                  }
                  .content {
                    padding: 30px;
                    color: #333;
                  }
                  .content p {
                    margin: 15px 0;
                    line-height: 1.6;
                  }
                  .cta-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 30px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 600;
                    margin: 20px 0;
                  }
                  .warning {
                    background-color: #fee;
                    border-left: 4px solid #f44;
                    padding: 15px;
                    border-radius: 6px;
                    font-size: 13px;
                    color: #c33;
                    margin: 20px 0;
                  }
                  .footer {
                    background-color: #f9f9f9;
                    padding: 20px;
                    text-align: center;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #999;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                  </div>
                  
                  <div class="content">
                    <p>We received a request to reset your password. Click the button below to create a new password.</p>
                    
                    <center>
                      <a href="${resetLink}" class="cta-button">Reset Password</a>
                    </center>
                    
                    <p><strong>Link expires in: 1 hour</strong></p>
                    
                    <div class="warning">
                      <strong>Did not request this?</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>© 2024 Relic. All rights reserved.</p>
                    <p>This is a security email. Do not share this link with anyone.</p>
                  </div>
                </div>
              </body>
            </html>
        `;

        await resend.emails.send({
            from: 'Relic <noreplya.relic@codeera.me>',
            to: email,
            subject: 'Password Reset Request - Relic',
            html: htmlContent,
        });

        console.log('Password reset email sent to:', email);
        return { success: true };

    } catch (error) {
        console.error('Password reset email failed:', error);
        throw new Error('Failed to send password reset email');
    }
}

module.exports = {
    generateVerificationCode,
    sendOTPEmail,
    sendPasswordResetEmail
};