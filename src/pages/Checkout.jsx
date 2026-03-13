import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { formatCurrencyForUser } from "../utils/currency";
import "./Checkout.css";

const getInitialAddresses = () => {
  try {
    const saved = localStorage.getItem("addresses");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function Checkout() {
  const { cartItems, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

  const [addresses, setAddresses] = useState(() => getInitialAddresses());
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const initial = getInitialAddresses();
    if (initial.length === 0) return null;
    const defaultIndex = initial.findIndex((a) => a?.isDefault);
    return defaultIndex >= 0 ? defaultIndex : 0;
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [charges, setCharges] = useState({ gstPercent: 0, deliveryCharge: 0 });
  const [coupons, setCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(addresses.length === 0);

  useEffect(() => {
    let active = true;

    axios
      .get("/api/settings")
      .then((res) => {
        if (!active) return;
        setCharges({
          gstPercent: Number(res.data?.gstPercent || 0),
          deliveryCharge: Number(res.data?.deliveryCharge || 0)
        });
      })
      .catch(() => {
        if (!active) return;
        setCharges({ gstPercent: 0, deliveryCharge: 0 });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoadingCoupons(true);

    axios
      .get("/api/coupons")
      .then((res) => {
        if (!active) return;
        setCoupons(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!active) return;
        setCoupons([]);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingCoupons(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
    const gstAmount = (subtotal * Number(charges.gstPercent || 0)) / 100;
    const deliveryCharge = Number(charges.deliveryCharge || 0);
    const grandTotal = subtotal + gstAmount + deliveryCharge;
    return { subtotal, gstAmount, deliveryCharge, grandTotal };
  }, [cartItems, charges.deliveryCharge, charges.gstPercent]);

  const finalTotal = useMemo(
    () => Math.max(0, Number(totals.grandTotal || 0) - Number(discount || 0)),
    [totals.grandTotal, discount]
  );

  const availableCoupons = useMemo(() => {
    const now = Date.now();
    return coupons.filter((coupon) => {
      const minOrder = Number(coupon?.minOrder || 0);
      const expiresAt = coupon?.expiresAt ? new Date(coupon.expiresAt).getTime() : null;
      if (expiresAt && !Number.isNaN(expiresAt) && expiresAt < now) return false;
      return totals.grandTotal >= minOrder;
    });
  }, [coupons, totals.grandTotal]);

  const getOrderHeaders = () => ({
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const applyCoupon = async (selectedCode) => {
    const code = String(selectedCode ?? couponCode ?? "").trim();
    if (!code) {
      setCouponMessage("Enter a coupon code.");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponMessage("");

    try {
      const res = await axios.post("/api/coupons/apply", {
        code,
        total: totals.grandTotal
      });
      setDiscount(Number(res.data?.discount || 0));
      setCouponCode(code.toUpperCase());
      setCouponMessage("Coupon applied.");
    } catch (err) {
      setDiscount(0);
      setCouponMessage(err?.response?.data?.message || "Invalid coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const saveAddress = () => {
    if (!name || !phone || !address) {
      alert("Please fill all fields");
      return;
    }

    const newAddress = {
      name,
      phone,
      address,
      isDefault: addresses.length === 0
    };

    const updated = [...addresses, newAddress];
    setAddresses(updated);
    localStorage.setItem("addresses", JSON.stringify(updated));
    if (selectedIndex === null) setSelectedIndex(0);

    setName("");
    setPhone("");
    setAddress("");
    setShowAddressForm(false);
  };

  const editAddress = (index) => {
    const current = addresses[index];
    setName(current.name);
    setPhone(current.phone);
    setAddress(current.address);
    setShowAddressForm(true);

    const updated = addresses.filter((_, i) => i !== index);
    setAddresses(updated);
    localStorage.setItem("addresses", JSON.stringify(updated));
  };

  const deleteAddress = (index) => {
    const updated = addresses.filter((_, i) => i !== index);
    setAddresses(updated);
    localStorage.setItem("addresses", JSON.stringify(updated));

    if (selectedIndex === index) {
      setSelectedIndex(updated.length ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const setDefaultAddress = (index) => {
    const updated = addresses.map((item, i) => ({
      ...item,
      isDefault: i === index
    }));
    setAddresses(updated);
    setSelectedIndex(index);
    localStorage.setItem("addresses", JSON.stringify(updated));
  };

  const submitOrder = async (selected) => {
    await axios.post(
      "/api/orders",
      {
        items: cartItems,
        total: finalTotal,
        shipping: selected,
        couponCode: couponCode || "",
        discount
      },
      getOrderHeaders()
    );

    await clearCart();
    navigate("/");
  };

  const validateCheckout = () => {
    const selected = addresses[selectedIndex];

    if (!selected) {
      alert("Please select or add an address.");
      return null;
    }

    if (!token) {
      alert("Please login to continue.");
      return null;
    }

    if (!cartItems.length) {
      alert("Your cart is empty.");
      return null;
    }

    return selected;
  };

  const processCheckout = async () => {
    const selected = validateCheckout();
    if (!selected) {
      return;
    }

    if (!razorpayKey) {
      alert("Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID.");
      return;
    }

    if (!window.Razorpay) {
      alert("Razorpay checkout failed to load.");
      return;
    }

    setIsPaying(true);
    let checkoutOpened = false;

    try {
      const { data } = await axios.post("/api/payment/create-order", {
        amount: finalTotal
      });

      const rzp = new window.Razorpay({
        key: razorpayKey,
        amount: data.amount,
        currency: data.currency,
        name: "Digital Sanskrit Guru",
        description: "Order Payment",
        order_id: data.id,
        prefill: {
          name: selected.name,
          contact: selected.phone
        },
        notes: {
          address: selected.address
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          }
        },
        handler: async (response) => {
          try {
            const verify = await axios.post("/api/payment/verify", response);

            if (!verify.data?.success) {
              alert("Payment verification failed");
              return;
            }

            await submitOrder(selected);
            alert("Payment successful");
          } catch {
            alert("Payment succeeded, but order creation failed");
          } finally {
            setIsPaying(false);
          }
        },
        theme: {
          color: "#1f6feb"
        }
      });

      rzp.on("payment.failed", () => {
        alert("Payment failed");
        setIsPaying(false);
      });

      checkoutOpened = true;
      rzp.open();
    } catch (err) {
      setIsPaying(false);
      alert(err?.response?.data?.message || "Unable to start payment");
    } finally {
      if (!checkoutOpened) {
        setIsPaying(false);
      }
    }
  };

  const placeOrder = async () => {
    const selected = validateCheckout();
    if (!selected) {
      return;
    }

    setIsPlacingOrder(true);
    try {
      await submitOrder(selected);
      alert("Order placed successfully");
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to place order");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-container">
        <div>
          <h2>Select Shipping Address</h2>

          <div className="address-list">
            {addresses.map((item, index) => (
              <div
                key={index}
                className={`address-card ${selectedIndex === index ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  checked={selectedIndex === index}
                  onChange={() => setSelectedIndex(index)}
                />

                <div className="address-info">
                  <strong>{item.name}</strong>
                  <p>{item.phone}</p>
                  <p>{item.address}</p>

                  {item.isDefault && <span className="default-badge">Default</span>}

                  <div className="address-actions">
                    <button onClick={() => editAddress(index)}>Edit</button>
                    <button onClick={() => deleteAddress(index)}>Delete</button>
                    {!item.isDefault && (
                      <button onClick={() => setDefaultAddress(index)}>Set Default</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="add-address">
            <div className="add-address-header add-address-header-row">
              <div>
                <h3>Add New Address</h3>
                <p>Save another delivery address for faster checkout.</p>
              </div>
              <button
                type="button"
                className="toggle-address-btn"
                onClick={() => setShowAddressForm((current) => !current)}
              >
                {showAddressForm ? "Close" : "Add New Address"}
              </button>
            </div>

            {showAddressForm && (
              <>
                <div className="add-address-fields">
                  <label>
                    <span>Full Name</span>
                    <input
                      placeholder="e.g. Rohan Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Phone Number</span>
                    <input
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Complete Address</span>
                    <textarea
                      placeholder="House no, street, city, state, pincode"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>
                </div>

                <button className="add-address-save-btn" onClick={saveAddress}>
                  Save Address
                </button>
              </>
            )}
          </div>
        </div>

        <div className="order-summary">
          <h2>Order Summary</h2>

          <div className="coupon-box">
            <input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button onClick={() => applyCoupon()} disabled={isApplyingCoupon}>
              {isApplyingCoupon ? "Applying..." : "Apply"}
            </button>
          </div>

          <div className="coupon-selector">
            <p className="coupon-selector-title">Available coupons</p>
            {isLoadingCoupons ? (
              <p className="coupon-selector-empty">Loading coupons...</p>
            ) : availableCoupons.length === 0 ? (
              <p className="coupon-selector-empty">No coupons available for this order amount.</p>
            ) : (
              <div className="coupon-chip-grid">
                {availableCoupons.map((coupon) => {
                  const code = String(coupon.code || "").toUpperCase();
                  const isActive = code === String(couponCode || "").toUpperCase();
                  const label =
                    coupon.type === "percentage"
                      ? `${Number(coupon.value || 0)}% OFF`
                      : `${formatCurrencyForUser(Number(coupon.value || 0))} OFF`;

                  return (
                    <button
                      key={coupon._id || code}
                      type="button"
                      className={isActive ? "coupon-chip active" : "coupon-chip"}
                      onClick={() => applyCoupon(code)}
                      disabled={isApplyingCoupon}
                    >
                      <strong>{code}</strong>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {couponMessage && <p className="coupon-message">{couponMessage}</p>}

          {cartItems.map((item, index) => (
            <div key={index} className="summary-item">
              <span>{item.name}</span>
              <span>
                {formatCurrencyForUser(item.price)} x {item.quantity || 1}
              </span>
            </div>
          ))}

          <hr />

          <div className="summary-item">
            <span>Subtotal</span>
            <span>{formatCurrencyForUser(totals.subtotal)}</span>
          </div>
          <div className="summary-item">
            <span>GST ({charges.gstPercent}%)</span>
            <span>{formatCurrencyForUser(totals.gstAmount)}</span>
          </div>
          <div className="summary-item">
            <span>Delivery</span>
            <span>{formatCurrencyForUser(totals.deliveryCharge)}</span>
          </div>
          <div className="summary-item">
            <span>Total</span>
            <span>{formatCurrencyForUser(totals.grandTotal)}</span>
          </div>

          {discount > 0 && <p className="discount">Discount: -{formatCurrencyForUser(discount)}</p>}

          <h2>Final Total: {formatCurrencyForUser(finalTotal)}</h2>
          <button className="place-order-btn" onClick={placeOrder} disabled={isPlacingOrder || isPaying}>
            {isPlacingOrder ? "Placing Order..." : "Place Order"}
          </button>
          <button className="pay-now-btn" onClick={processCheckout} disabled={isPaying}>
            {isPaying ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
