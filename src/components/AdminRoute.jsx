import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function AdminRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isAdmin) {
    return (
      <div style={{ padding: "24px" }}>
        <h2>Admin access denied</h2>
        <p>This account does not have admin permissions.</p>
      </div>
    );
  }

  return children;
}

export default AdminRoute;
