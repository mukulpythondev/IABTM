import nodemailer from 'nodemailer'

const sendResetEmail = async (name , email , token)=>{

    const emailUser = process.env.EMAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD
try {
    const tranporter = nodemailer.createTransport({
        host : 'smtp.gmail.com',
        port : 587,
        secure : false,
        requireTLS :true,
        auth : {
            user : emailUser,
            pass : emailPassword
        }
    });
    const mailOptions = {
        from : emailUser,
        to:email,
        subject : 'For Reset Password',
        html : '<p> Hii '+name+' , Pls copy the link and <a href = "http://localhost:300/reset-password?token='+token+'"></a> reset your password'
    }
    tranporter.sendMail(mailOptions , function(err , info){
        if(err) {
            console.log(err)
        }
        else {
            console.log("mail has been sent - " , info.response);

        }
    })
} catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error", error: error.message });
}
}

export default sendResetEmail