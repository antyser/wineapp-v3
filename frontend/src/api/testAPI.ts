// Test script for API configuration
import { apiClient } from './apiClient';
import { cellarService } from './cellarService';

console.log('=== API TEST SCRIPT STARTED ===');

// 1. Test API Configuration
console.log('\n1. TESTING API CLIENT CONFIGURATION');
console.log('API Client baseURL:', apiClient.defaults.baseURL);

const runTests = async () => {
  try {
    // 2. Test /health endpoint
    console.log('\n2. TESTING HEALTH ENDPOINT');
    try {
      const healthResponse = await apiClient.get('/health');
      console.log('Health check response:', healthResponse.data);
    } catch (error) {
      console.error('Health check failed:', error.message);
    }

    // 3. Test cellarService.getCellars()
    console.log('\n3. TESTING CELLAR SERVICE - GET CELLARS');
    try {
      const cellarsResponse = await cellarService.getCellars();
      console.log('getCellars response:', cellarsResponse);
      console.log(`Found ${cellarsResponse.cellars?.length || 0} cellars`);
    } catch (error) {
      console.error('getCellars failed:', error.message);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }

    // 4. Test cellarService.createCellar()
    console.log('\n4. TESTING CELLAR SERVICE - CREATE CELLAR');
    const testUserId = '443ce2fe-1d5b-48af-99f3-15329714b63d';
    const testCellarData = {
      name: `Test Cellar ${new Date().toISOString()}`,
      sections: ['Test Section 1', 'Test Section 2'],
      user_id: testUserId,
    };

    try {
      console.log('Creating cellar with data:', testCellarData);
      const createResponse = await cellarService.createCellar(testCellarData);
      console.log('createCellar response:', createResponse);

      if (createResponse?.id) {
        console.log('\nCellar created successfully! ID:', createResponse.id);
      } else {
        console.warn('Cellar created but no ID returned in response');
      }
    } catch (error) {
      console.error('createCellar failed:', error.message);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  } catch (error) {
    console.error('Test script failed with error:', error);
  } finally {
    console.log('\n=== API TEST SCRIPT COMPLETED ===');
  }
};

// Run all tests
runTests();
