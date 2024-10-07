const nodemailer = require("nodemailer");
const fs = require("fs");
const speakeasy = require("speakeasy");

// OTP generator function
function generateOTP() {
  return speakeasy.totp({
    secret: process.env.OTP_SECRET || "secret_key", // Use a secure key in production
    encoding: "base32",
  });
}

// Mailer function
const NodeMailer = (Users) => {
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE === "true", // Convert to boolean
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  // Read the image file
  const image = fs.readFileSync("./asset/image.png");
  // Loop through each user and send an email
  Users.forEach((User) => {
    const otp = generateOTP(); // Generate OTP for each user

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: User.email,
      subject: "Your OTP Code",
      html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        width: 600px; /* Set the desired width */
                        margin: 0 auto; /* Center the container horizontally */
                        border-radius: 10px; /* Rounded corners */
                        overflow: hidden; /* Ensure the rounded corners are applied */
                        border: 1px solid #ccc; /* Add border for consistency */
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
                    text-align: right; /* Right align footer content */
                    }
                    .footer img {
                        vertical-align: middle; /* Align image vertically in line with text */
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <img src="cid:image" alt="illogo" width="100px">
                    </div>
                    <div class="container">
                        <p>Hello, ${User.nama}</p>
                        <p>Your OTP code is:</p>
                        <div class="otp-container">
                            <span class="otp">${otp}</span>
                        </div>
                        <p>Please use this OTP to log in. Make sure to verify it promptly.</p>
                        <p>Regards,<br>Infinite Learning</p>
                    </div>
                    <div class="footer">
                        <img src="cid:image" alt="illogo" width="50px"> Infinite Learning
                    </div>
                </div>
            </body>
            </html>
            `,
      attachments: [
        {
          filename: "image.png",
          content: image,
          cid: "image", // Content ID for referencing in HTML
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email to", User.email, ":", error);
      } else {
        console.log("Email sent to", User.email, ":", info.response);
      }
    });
  });
};

module.exports = { NodeMailer };
