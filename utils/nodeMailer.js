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
                        background-color: #fff;
                    }
                    .content-wrapper {
                        background-color: rgba(243, 236, 255, 0.6);
                        border: 2px solid #A164FF;
                        border-radius: 40px;
                        padding: 20px;
                        margin: 80px 60px;
                        text-align: left;
                    }
                    .otp-container {
                        text-align: center;
                        padding: 18px;
                        padding-bottom: 30px;
                    }
                    .otp {
                        font-size: 30px;
                        font-weight: bold;
                        color:#4C228C;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        background-color: rgba(76, 34, 140, 0.35);
                        display: inline-block;
                        letter-spacing: 10px;
                    }
                    .center-text {
                        text-align: center;
                    }
                    .large-text {
                        text-align: left;
                        font-size: 24px; 
                        font-weight: bold; 
                    }
                    .important-text {
                        color: red;
                        font-weight: bold;
                        margin-top: 10px;
                    }
                    .footer {
                        background-color: #f9f9f9;
                        padding: 15px 20px;
                        color: #000000;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <img src="https://www.dropbox.com/scl/fi/g6hsqn5paewmlse3l5g3c/banner_otp.png?rlkey=z21dcdsar31610jird1bunmqc&st=psgadi12&raw=1"
                            alt="Infinite Track Logo" style="display: block; margin: 0 auto; width: 100%; height: auto;">
                    </div>
                    <div class="container">
                        <div class="content-wrapper">
                            <img src="https://www.dropbox.com/scl/fi/klf8miwhtmc9n92bhghng/logo_revisi.png?rlkey=x81ajna4q137pxssxo8mol0g0&st=pksq9oie&raw=1" 
                                alt="Decorative Image" style="display: block; margin: 0 auto; width: 100%; max-width: 200px;">
                            <p class="large-text">Hello, ${user.name}</p>
                            <p>Great to see you aboard! Let's quickly verify your email to get you started. Your verification code is:</p>
                            <div class="otp-container">
                                <span class="otp">${otp}</span>
                            </div>
                            <p class="important-text">This code only available for 1 minute.</p>
                            <p>Please use this OTP to reset your password. Never share your code with anyone.</p>
                            <p>Cheers,<br>Infinite Track by Infinite Learning.</p>
                        </div>
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
