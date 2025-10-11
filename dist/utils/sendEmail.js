"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const appError_1 = require("../errors/appError");
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)({ path: "./config.env" });
const { EMAIL_HOST, EMAIL_PORT, EMAIL_PASSWORD, EMAIL_USERNAME, EMAIL_FROM } = process.env;
if (!EMAIL_HOST ||
    !EMAIL_PORT ||
    !EMAIL_PASSWORD ||
    !EMAIL_USERNAME ||
    !EMAIL_FROM) {
    throw new appError_1.AppError("Please make sure that these environmental variables exist", 400);
}
const sendEmail = async (options) => {
    try {
        const transporter = nodemailer_1.default.createTransport({
            host: EMAIL_HOST,
            port: Number(EMAIL_PORT),
            secure: true,
            auth: {
                user: EMAIL_USERNAME,
                pass: EMAIL_PASSWORD,
            },
        });
        const emailTemplate = `
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f4faf7;
                color: #222;
                line-height: 1.6;
              }
              .email-container {
                max-width: 600px;
                margin: 24px auto;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 2px 16px rgba(44, 62, 80, 0.08);
                overflow: hidden;
                border: 1px solid #e0f2ef;
              }
              .header {
                background: linear-gradient(90deg, #1de9b6 0%, #1dc8e9 100%);
                color: #fff;
                text-align: center;
                padding: 32px 20px 20px 20px;
              }
              .header .icon {
                font-size: 48px;
                margin-bottom: 8px;
              }
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 1px;
                margin-bottom: 0;
              }
              .content {
                padding: 32px 24px 24px 24px;
              }
              .content h2 {
                font-size: 22px;
                color: #1dc8e9;
                margin-bottom: 12px;
              }
              .content p {
                font-size: 16px;
                margin-bottom: 18px;
                color: #444;
              }
              .code-box {
                background: #e0f7fa;
                color: #009688;
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 4px;
                border-radius: 8px;
                padding: 18px 0;
                text-align: center;
                margin: 24px 0 18px 0;
                border: 1.5px dashed #1de9b6;
              }
              .button {
                display: inline-block;
                background: linear-gradient(90deg, #1de9b6 0%, #1dc8e9 100%);
                color: #fff;
                padding: 14px 28px;
                border-radius: 6px;
                text-decoration: none;
                font-size: 16px;
                font-weight: 600;
                margin: 18px 0 0 0;
                transition: background 0.2s;
              }
              .button:hover {
                background: linear-gradient(90deg, #1dc8e9 0%, #1de9b6 100%);
              }
              .footer {
                background: #f7f7f7;
                text-align: center;
                padding: 20px 10px;
                font-size: 13px;
                color: #7a8a8f;
              }
              .footer p { margin: 4px 0; }
              @media (max-width: 600px) {
                .email-container { width: 100%; }
                .content, .header, .footer { padding: 16px; }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <!-- Header Section with Logo and Company Name -->
              <div class="header">
                <div class="icon">🛍️</div>
                <h1>Unishopping</h1>
              </div>
              <!-- Main Content Area -->
              <div class="content">
                <h2>Hello, ${options.name}!</h2>
                <p>${options.message}</p>
                <div class="code-box">${options.vCode}</div>
                <!-- Action Button -->
                 <!--   <a href="${options.link}" class="button">${options.linkName}</a> -->
              </div>
              <!-- Footer Section -->
              <div class="footer">
                <p>Unishoppin | Enugu, Nigeria | support@unishopping.com</p>
                <p>&copy; 2024 Unishoppin. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
        `;
        const mailOptions = {
            to: options.email,
            from: EMAIL_FROM,
            subject: options.subject,
            name: options.name,
            html: emailTemplate,
        };
        await transporter.sendMail(mailOptions);
        console.log("successful");
    }
    catch (error) {
        throw new appError_1.AppError("An error occured. could you please try again", 400);
    }
};
exports.sendEmail = sendEmail;
