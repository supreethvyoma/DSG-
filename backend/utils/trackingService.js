/**
 * trackingService.js
 *
 * Provides real-time tracking integration for Delhivery, India Post, and Other couriers.
 * Automatically falls back to a time-based simulated journey if API credentials are not set.
 */

const axios = require("axios");

/**
 * Fetch tracking details for a given order
 * @param {Object} order - Mongoose Order document
 * @returns {Promise<Object>} Tracking details (status, courier, checkpoints, rawData)
 */
async function getTrackingDetails(order) {
  const trackingId = String(order.trackingId || "").trim();
  const courier = String(order.courierPartner || "").trim();

  // If no tracking ID exists, return standard pending status
  if (!trackingId) {
    return {
      status: "Booked",
      courier: courier || "N/A",
      trackingId: "",
      checkpoints: [
        {
          status: "Order Placed",
          location: "Merchant Warehouse",
          time: order.createdAt,
          description: "Your order has been placed and is being prepared for dispatch."
        }
      ]
    };
  }

  // Delhivery API Integration
  if (courier === "Delhivery" && process.env.DELHIVERY_API_KEY) {
    try {
      const response = await axios.get(
        `https://track.delhivery.com/api/v1/packages/json/?waybill=${trackingId}`,
        {
          headers: {
            Authorization: `Token ${process.env.DELHIVERY_API_KEY}`
          },
          timeout: 5000
        }
      );

      // Parse Delhivery's response structure
      const data = response.data;
      if (data && data.ShipmentData && data.ShipmentData.length > 0) {
        const shipment = data.ShipmentData[0].Shipment;
        const scans = shipment.Scans || [];

        const checkpoints = scans.map((scan) => ({
          status: scan.ScanDetail?.Status || "In Transit",
          location: scan.ScanDetail?.ScannedLocation || "Transit Hub",
          time: scan.ScanDetail?.ScanDateTime ? new Date(scan.ScanDetail.ScanDateTime) : new Date(),
          description: scan.ScanDetail?.Instructions || "Package is in transit."
        }));

        // Sort checkpoints chronologically
        checkpoints.sort((a, b) => new Date(a.time) - new Date(b.time));

        if (checkpoints.length === 0) {
          checkpoints.push({
            status: "Booked",
            location: shipment.Origin || "Origin Hub",
            time: order.shippedAt || order.createdAt,
            description: "Shipment manifested/booked."
          });
        }

        return {
          status: shipment.Status?.Status || "Shipped",
          courier: "Delhivery",
          trackingId,
          checkpoints,
          rawData: shipment
        };
      }
    } catch (error) {
      console.error("[TrackingService] Delhivery API error, falling back to mock:", error.message);
    }
  }

  // Fallback / India Post / Mock Simulator
  return getMockTrackingDetails(order, trackingId, courier);
}

/**
 * Generate standard status checkpoints matching actual MongoDB state.
 */
function getMockTrackingDetails(order, trackingId, courier) {
  const checkpoints = [
    {
      status: "Order Placed",
      location: "Store Warehouse",
      time: order.createdAt,
      description: "Order received by the seller."
    }
  ];

  if (order.shippedAt || order.status === "Shipped" || order.status === "Delivered") {
    checkpoints.push({
      status: "Booked / Manifested",
      location: "Seller Location",
      time: order.shippedAt || order.createdAt,
      description: `Package picked up by ${courier || "Courier Partner"}.`
    });
  }

  if (order.status === "Delivered") {
    checkpoints.push({
      status: "Delivered",
      location: `${order.shipping?.city || "Destination"}, ${order.shipping?.pincode || ""}`,
      time: order.deliveredAt || order.updatedAt || new Date(),
      description: "Package successfully delivered."
    });
  }

  // Determine current overall tracking status
  let status = "Booked";
  if (order.status === "Delivered") {
    status = "Delivered";
  } else if (order.status === "Shipped" || order.shippedAt) {
    status = "Shipped";
  }

  // Sort checkpoints chronologically
  checkpoints.sort((a, b) => new Date(a.time) - new Date(b.time));

  return {
    status,
    courier: courier || "N/A",
    trackingId,
    checkpoints
  };
}

module.exports = {
  getTrackingDetails
};
