const nodemailer = require("nodemailer");
require("dotenv").config();
const mysql = require("mysql2/promise");

async function sendOTP(email, otp) {
  try {
    // Buat koneksi ke database
    const connection = await mysql.createConnection({
      host: process.env.HOST,
      user: process.env.UNAME,
      password: process.env.PASSWORD,
      database: "infinite_track",
      port: process.env.DBPORT,
    });

    // Ambil nama user berdasarkan email
    const [rows] = await connection.execute(
      "SELECT name FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    const user = rows[0];

    // Opsi email
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
                        padding: 10px 20px;
                        border-bottom: 3px solid #7C3AED; 
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
                    .center-text {
                        text-align: center;
                    }
                    .large-text {
                        text-align: center;
                        font-size: 24px; 
                        font-weight: bold; 
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
                        <img src="https://www.dropbox.com/scl/fi/n0zajm6lhrjp83e7nnwe5/logo.png?rlkey=xsg0meo8lqo2mzu7022jvuipv&st=wm2p4vnf&raw=1"
                            alt="Infinite Track Logo" style="display: block; margin: 0 auto; width: 100%; max-width: 100px; padding-top: 20px; padding-bottom: 20px;">
                    </div>
                    <div class="container">
                        <img src="https://www.dropbox.com/scl/fi/nhzo32dtupi2v8kcqgpo4/img_otp.png?rlkey=laje4h7p3js23zn5vb035ejid&st=cnoog2az&raw=1" 
                            alt="Decorative Image" style="display: block; margin: 0 auto; width: 100%; max-width: 300px;">
                        <p class="large-text">Hello, ${user.name}</p>
                        <p class="center-text">Your OTP code is:</p>
                        <div class="otp-container">
                            <span class="otp">${otp}</span>
                        </div>
                        <p>Please use this OTP to reset your password. Make sure to verify it promptly.</p>
                        <p>Regards,<br>Infinite Track by Infinite Learning</p>
                    </div>
                    <div class="footer">
                    </div>
                </div>
            </body>
            </html>`,
    };

    // Membuat transporter email
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

    // Mengirim email
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
