
import axios from "axios";
import "dotenv/config";

const laravel = axios.create({
  baseURL: process.env.LARAVEL_API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LARAVEL_API_TOKEN}`,
  },
  timeout: 15000,
});

export default laravel;
