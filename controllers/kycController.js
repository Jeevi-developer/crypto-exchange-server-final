import KYC from "../models/KYC.js";
import User from "../models/User.js";

const KYC_STATUSES = {
  NOT_SUBMITTED: "not_submitted",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const submitKYC = async (req, res) => {
  const userId = req.user.id; // from auth middleware
  const {
    firstName,
    lastName,
    dob,
    mobileNumber,
    addressLine1,
    locality,
    country,
    pinCode,
    state,
    district,
    city,
    pan,
    aadhar,
    accountType,
    accountNumber,
    accountStatus,
    dateOfOpening,
    branchCode,
  } = req.body;

  try {
    // find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // check if KYC already exists
    let kyc = await KYC.findOne({ user: userId });

    if (kyc) {
      // update existing KYC
      kyc.firstName = firstName;
      kyc.lastName = lastName;
      kyc.dob = dob;
      kyc.mobileNumber = mobileNumber;
      kyc.addressLine1 = addressLine1;
      kyc.locality = locality;
      kyc.country = country;
      kyc.pinCode = pinCode;
      kyc.state = state;
      kyc.district = district;
      kyc.city = city;
      kyc.pan = pan;
      kyc.aadhar = aadhar;
      kyc.accountType = accountType;
      kyc.accountNumber = accountNumber;
      kyc.accountStatus = accountStatus;
      kyc.dateOfOpening = dateOfOpening;
      kyc.branchCode = branchCode;
      kyc.selfie = req.file ? req.file.path : kyc.selfie; // update only if file uploaded
      kyc.status = KYC_STATUSES.PENDING;
      await kyc.save();
    } else {
      // create new KYC
      kyc = new KYC({
        user: userId,
        firstName,
        lastName,
        dob,
        mobileNumber,
        addressLine1,
        locality,
        country,
        pinCode,
        state,
        district,
        city,
        pan,
        aadhar,
        accountType,
        accountNumber,
        accountStatus,
        dateOfOpening,
        branchCode,
        selfie: req.file ? req.file.path : null,
        status: KYC_STATUSES.PENDING,
      });
      await kyc.save();
    }

    // update User only with kycId + status
    user.kycStatus = KYC_STATUSES.PENDING;
    user.kycId = kyc._id;
    await user.save();

    res.status(200).json({
      message: "KYC submitted successfully",
      kycId: kyc._id,
      status: user.kycStatus,
    });
  } catch (err) {
    console.error("KYC submission error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getKYCStatus = async (req, res) => {
  const userId = req.user.id; // from auth middleware

  try {
    const user = await User.findById(userId).select("kycStatus kycId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let kycDetails = null;

    // if user has submitted KYC, fetch minimal details
    if (user.kycId) {
      kycDetails = await KYC.findById(user.kycId).select(
        "status type createdAt updatedAt"
      );
    }

    res.status(200).json({
      kycStatus: user.kycStatus,
      kycDetails,
    });
  } catch (err) {
    console.error("Error fetching KYC status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update mobileNumber & country in KYC
export const updateAdditionalDetails = async (req, res) => {
  try {
    const kycId = req.params.id;
    const { mobileNumber, country } = req.body;

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      { mobileNumber, country },
      { new: true }
    );

    res.status(200).json(kyc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update additional details" });
  }
};
