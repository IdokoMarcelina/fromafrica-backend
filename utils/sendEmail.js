const nodemailer = require('nodemailer')


const sendEmail = (subject, message, sendto, sentfrom, replyto)=>{

    const transporter = nodemailer.createTransport({

        host:process.env.SERVICE,
        port:465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
    });


    const options = {
        to:sendto,
        from:sentfrom,
        html:message,
        subject: subject,
        replyto: replyto
    }

    transporter.sendMail(options, function(err,info){
        if(err){
            console.log(err);
            
        }else{
            console.log(info);
            
        }
    })



}

module.exports = sendEmail