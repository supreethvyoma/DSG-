# Digital Sanskrit Guru

Frontend and backend code for the Digital Sanskrit Guru storefront, admin tools, and collection browsing experience.

## Stack

- React + Vite
- Express
- MongoDB

## Local development

1. Install dependencies with `npm install`
2. Start the frontend with `npm run dev`
3. Start the backend with `node backend/server.js`

## Environment files

- Copy [.env.example](./.env.example) to `.env` if you need frontend build-time variables.
- Copy [backend/.env.example](./backend/.env.example) to `backend/.env` for backend secrets and database config.

## Hostinger deployment

This project is now set up to run on Hostinger as a single Node.js app:

1. Upload the full `my-ecommerce-app` project to Hostinger.
2. Install dependencies with `npm install`.
3. Build the frontend with `npm run build`.
4. Start the backend with `npm start`.
5. Point the Node.js application startup file to `backend/server.js` if Hostinger asks for it.

### Required backend environment variables

- `MONGO_URI`
- `JWT_SECRET`
- `PORT`

### Optional backend environment variables

- `RAZORPAY_KEY_ID`
- `RAZORPAY_SECRET`
- `ALLOW_DUMMY_PAYMENT`
- `CORS_ORIGIN`

### Optional frontend build variables

- `VITE_API_BASE_URL`
  Leave empty when the frontend and backend are hosted together on the same domain.
- `VITE_ONDEMAND_URL`
  Set this to your deployed OnDemand site URL instead of localhost.
- `VITE_RAZORPAY_KEY_ID`
- `VITE_ENABLE_DUMMY_PAYMENT`

### Notes

- In production, the Express server serves the built `dist` frontend automatically.
- API calls use same-origin by default, so you usually do not need `VITE_API_BASE_URL` on Hostinger.
- If you rebuild the frontend after changing any `VITE_*` variable, run `npm run build` again.
