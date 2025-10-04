import mongoose from "mongoose";

const BalanceSchema = new mongoose.Schema({
  available: { type: mongoose.Types.Decimal128, default: 0 },
  locked: { type: mongoose.Types.Decimal128, default: 0 },
});

const WalletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    balances: {
      BTC: { type: BalanceSchema, default: () => ({}) },
      ETH: { type: BalanceSchema, default: () => ({}) },
      USDT: { type: BalanceSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

// Convert Decimal128 to number for frontend
WalletSchema.methods.getPlain = function () {
  const obj = this.toObject();
  for (const asset of Object.keys(obj.balances)) {
    obj.balances[asset].available = Number(obj.balances[asset].available.toString());
    obj.balances[asset].locked = Number(obj.balances[asset].locked.toString());
  }
  return obj;
};

export default mongoose.model("Wallet", WalletSchema);
