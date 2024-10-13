const nodemailer = require("nodemailer");
require("dotenv").config();
const mysql = require("mysql2/promise");

async function sendOTP(email, otp) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.HOST,
      user: process.env.UNAME,
      password: process.env.PASSWORD,
      database: "infinite_track",
      port: process.env.DBPORT,
    });

    const [rows] = await connection.execute(
      "SELECT name FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    const user = rows[0];

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
                        background-color: #fff;
                        color: #fff; 
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
                        padding-right: 30px;
                        padding-left: 30px;
                        border-radius: 5px;
                        background-color: #8169AE;
                        display: inline-block;
                    }
                    .center-text {
                        text-align: center;
                    }
                    .large-text {
                        text-align: center;
                        font-size: 24px; 
                        font-weight: bold; 
                    }
                    .footer {
                        background-color: #f9f9f9;
                        padding: 15px 20px;
                        color: #f9f9f9;
                        text-align: right;
                    }
                    .footer img {
                        vertical-align: middle;
                        margin-right: 10px;
                    }
                    .padding-bottom {
                        padding-bottom: 30px; 
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <img src="https://www.dropbox.com/scl/fi/b5p8cn0qif9868hctokp5/banner_otp_verification.png?rlkey=z4sgwd9oasds65l8o416um0vj&st=ks1fpemq&raw=1"
                            alt="Infinite Track Logo" style="display: block; margin: 0 auto; width: 100%; height: auto;">
                    </div>
                    <div class="container">
                        <img src="https://www.dropbox.com/scl/fi/zjsazg52n3iohyiko4rp7/logo_revisi.png?rlkey=27tr5qxfry02lnkx5ti2tkyjt&st=vu95vgju&raw=1" 
                            alt="Decorative Image" style="display: block; margin: 0 auto; width: 100%; max-width: 200px;">
                        <p class="large-text">Hello, ${user.name}</p>
                        <p class="center-text">Great to see you aboard! Let's quickly<br>verify your email to get you started.<br>Your verification code is:</p>
                        <div class="otp-container">
                            <span class="otp">${otp}</span>
                        </div>
                        <p>Please use this OTP to reset your password. Never share your code<br>with anyone.</p>
                        <p class="padding-bottom">Cheers,<br>Infinite Track by Infinite Learning.</p>
                    </div>
                    <div class="footer">
                    </div>
                </div>
            </body>
            </html>`,
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
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw error;
  }
}

module.exports = sendOTP;
