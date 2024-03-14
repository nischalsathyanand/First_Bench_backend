import SmartApi from "smartapi-javascript/lib/smartapi-connect";
import { authenticator } from "otplib";
const User = require("../../models/user"); // Import the User model from your schema definition

function generateTotpToken(secretKey) {
  return authenticator.generate(secretKey);
}

export async function connect(req, res, next) {
  try {
    console.log("Connecting to smart api..");

    const { uId } = req.body;

    const userData = await User.findOne({ userId: uId });
    console.log(userData);

    if (!userData) {
      throw new Error("User not found");
    }

    const { userId, password, apiKey, totpKey } = userData;

    let smart_api = new SmartApi({
      api_key: apiKey,
    });

    const data = await smart_api.generateSession(
      userId,
      password,
      generateTotpToken(totpKey)
    );
    console.log(data);

    const profileData = await smart_api.getProfile();
    console.log(profileData);

    /*const searchData = await smart_api.searchScrip({
      exchange: "BSE",
      searchscrip: "Titan",
    });
    console.log(searchData);*/

    next();
  } catch (error) {
    console.error("Error:", error);
    next(error);
  }
}
