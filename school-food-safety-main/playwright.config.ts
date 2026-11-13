import { defineConfig } from '@playwright/test'
export default defineConfig({testDir:'./tests',timeout:30000,fullyParallel:false,use:{baseURL:'http://127.0.0.1:5173',channel:process.env.PLAYWRIGHT_CHANNEL??'chrome',headless:true},webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:true},reporter:'list'})
