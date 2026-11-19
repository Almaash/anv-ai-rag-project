import laravel from "../config/laravel.js";


export const testLaravelConnection = async () => {
  try {
    const response = await laravel.get("/ai/dashboard");

    return response.data;
  } catch (error) {
    console.error(
      "Laravel API Error:",
      error.response?.data || error.message
    );

    throw error;
  }
};


export const callLaravelApi = async (
  endpoint,
  params = {}
) => {
  try {
    const response = await laravel.get(endpoint, { params });

    return response.data;
  } catch (error) {
    console.error(
      "Laravel API Error:",
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      "Unable to retrieve CRM information"
    );
  }
};
