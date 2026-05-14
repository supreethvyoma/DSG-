import { useEffect, useState } from "react";
import { WishlistContext } from "./WishlistStore";
import { useToast } from "../hooks/useToast";

export function WishlistProvider({ children }) {
  const { showToast } = useToast();

  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem("wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (product) => {
    let added = false;

    setWishlist((prev) => {
      const exists = prev.find((p) => p._id === product._id);
      if (exists) return prev;
      added = true;
      return [...prev, product];
    });

    if (added) {
      showToast("Added to wishlist");
    }
  };

  const removeFromWishlist = (id) => {
    setWishlist((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
