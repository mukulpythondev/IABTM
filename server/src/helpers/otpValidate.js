const otpVerification = async (otpTime) => {
    try {
        console.log("Stored OTP Expiration Time - ", otpTime);

        const currentDate = new Date();
        const timeDifference = (otpTime - currentDate.getTime()) / 1000;
        const differenceInMinutes = timeDifference / 60;
        const expiryMin = Math.abs(differenceInMinutes);
        
        console.log("Expires in minutes = ", expiryMin);

        if (expiryMin > 2) {
            return true;
        }

        return false;

    } catch (error) {
        console.log(error);
    }
}

export default otpVerification;
