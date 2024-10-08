const nodemailer = require("nodemailer");
require("dotenv").config();
const path = require("path");

function sendOTP(email, otp) {
  // Correct path to the image file
  const imagePath = path.join(__dirname, "..", "assets", "image.png"); // Navigate one level up to access the assets folder

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "OTP Verification",
    html: `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        width: 600px;
                        margin: 0 auto;
                        border-radius: 10px;
                        overflow: hidden;
                        border: 1px solid #ccc;
                    }
                    .header {
                        background-color: #7C3AED;
                        color: #fff;
                        padding: 10px 20px;
                    }
                    .container {
                        font-family: Arial, sans-serif;
                        padding: 18px 20px 18px;
                        color: #000000;
                        background-color: #f9f9f9;
                    }
                    .otp-container {
                        text-align: center;
                        padding: 18px;
                    }
                    .otp {
                        font-size: 18px;
                        font-weight: bold;
                        color: #FFFFFF;
                        border: 1px solid #ccc;
                        padding: 10px;
                        border-radius: 5px;
                        background-color: #7C3AED;
                        display: inline-block;
                    }
                    .footer {
                        background-color: #7C3AED;
                        padding: 15px 20px;
                        color: #FFFFFF;
                        text-align: right;
                    }
                    .footer img {
                        vertical-align: middle;
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <img src="cid:headerImage" alt="Infinite Track Logo" width="100px">
                    </div>
                    <div class="container">
                        <img src="cid:image" alt="Decorative Image" style="width: 100%; max-width: 600px;">
                        <p>Hello</p>
                        <p>Your OTP code is:</p>
                        <div class="otp-container">
                            <span class="otp">${otp}</span>
                        </div>
                        <p>Please use this OTP to reset your password. Make sure to verify it promptly.</p>
                        <p>Regards,<br>Infinite Track by Infinite Learning</p>
                    </div>
                    <div class="footer">
                        <img src="cid:footerImage" alt="Infinite Track Logo" width="50px">
                    </div>
                </div>
            </body>
            </html>`,
    attachments: [
      {
        filename: "image.png", // Change this if your image file has a different extension
        path: imagePath, // Full path to the image
        cid: "image", // Same cid value as in the html img src
      },
      {
        filename: "image.png", // Optional: replace with your header logo image if applicable
        path: path.join(__dirname, "..", "assets", "image.png"),
        cid: "headerImage", // Change to desired cid for header image
      },
      {
        filename: "image.png", // Optional: replace with your footer logo image if applicable
        path: path.join(__dirname, "..", "assets", "image.png"),
        cid: "footerImage", // Change to desired cid for footer image
      },
    ],
  };

  let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error occurred:", error);
        reject(error);
      } else {
        console.log("OTP Email sent successfully:", info.response);
        resolve(info.response);
      }
    });
  });
}

module.exports = sendOTP;
