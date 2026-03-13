import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCart } from "../hooks/useCart";
import { formatCurrencyForUser } from "../utils/currency";
import "./Cart.css";

function Cart() {
  const { cartItems, removeFromCart, updateQty } = useCart();
  const [charges, setCharges] = useState({ gstPercent: 0, deliveryCharge: 0 });

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  useEffect(() => {
    let active = true;
    axios
      .get("http://localhost:5000/api/settings")
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

  const totals = useMemo(() => {
    const subtotal = Number(total || 0);
    const gstAmount = (subtotal * Number(charges.gstPercent || 0)) / 100;
    const deliveryCharge = Number(charges.deliveryCharge || 0);
    return {
      subtotal,
      gstAmount,
      deliveryCharge,
      grandTotal: subtotal + gstAmount + deliveryCharge
    };
  }, [total, charges.deliveryCharge, charges.gstPercent]);

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <h2>Your Cart is Empty</h2>
        <Link to="/">Go Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Your Shopping Cart</h1>

      <div className="cart-container">
        <div className="cart-items">
          {cartItems.map((item, index) => {
            const qty = item.quantity || 1;

            return (
              <div key={item._id || item.id || index} className="cart-item">
                <img
                  src={item.image || "https://picsum.photos/200"}
                  alt={item.name}
                  className="cart-image"
                />

                <div className="cart-info">
                  <h3>{item.name}</h3>
                  <p>{formatCurrencyForUser(item.price)}</p>

                  <div className="qty-box">
                    <button onClick={() => updateQty(item._id || item.id, qty > 1 ? qty - 1 : 1)}>
                      -
                    </button>
                    <span>{qty}</span>
                    <button onClick={() => updateQty(item._id || item.id, qty + 1)}>+</button>
                  </div>
                </div>

                <button className="remove-btn" onClick={() => removeFromCart(item._id || item.id)}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <h2>Subtotal</h2>
          <p className="cart-total">{formatCurrencyForUser(totals.subtotal)}</p>
          <p>GST ({charges.gstPercent}%): {formatCurrencyForUser(totals.gstAmount)}</p>
          <p>Delivery: {formatCurrencyForUser(totals.deliveryCharge)}</p>
          <h3>Total: {formatCurrencyForUser(totals.grandTotal)}</h3>

          <Link to="/checkout">
            <button className="checkout-btn">Proceed to Checkout</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Cart;
