import { useContext } from "react";
import { WishlistContext } from "../context/WishlistStore";

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    return {
      wishlist: [],
      addToWishlist: () => {},
      removeFromWishlist: () => {}
    };
  }
  return context;
}
