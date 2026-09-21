// D:/MyApplication/src/services/maps/route.service.js

/**
 * Route Service Abstraction
 * Handles calculating routes between origin and destination.
 */

export const routeService = {
  /**
   * Calculates a route between two points.
   * @param {{latitude: number, longitude: number}} origin
   * @param {{latitude: number, longitude: number}} destination
   * @returns {Promise<{distance: number, duration: number, polyline: string}>}
   */
  async calculateRoute(origin, destination) {
    console.log('routeService: Calculating route...');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          distance: 15.5, // in kilometers or miles based on preference
          duration: 35, // in minutes
          polyline: "mock_encoded_polyline_string",
        });
      }, 800);
    });
  }
};

export default routeService;
