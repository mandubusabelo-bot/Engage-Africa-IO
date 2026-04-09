# Get Your Supabase API Keys

## Steps:

1. **Go to your Supabase project:**
   https://oaeirdgffwodkbcstdfh.supabase.co

2. **Click the gear icon (⚙️) at the bottom left** to open Project Settings

3. **Click "API" in the left menu**

4. **You'll see two keys - copy both:**
   
   **anon public key** (looks like this):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZWlyZGdmZndvZGtiY3N0ZGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODI4NzAsImV4cCI6MjA1OTg1ODg3MH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
   
   **service_role key** (also starts with eyJ):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZWlyZGdmZndvZGtiY3N0ZGZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI4Mjg3MCwiZXhwIjoyMDU5ODU4ODcwfQ.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   ```

5. **Open `backend/.env` file**

6. **Replace these lines:**
   ```env
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_KEY=your_service_key_here
   ```
   
   **With your actual keys:**
   ```env
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZWlyZGdmZndvZGtiY3N0ZGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODI4NzAsImV4cCI6MjA1OTg1ODg3MH0.YOUR_ACTUAL_KEY
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZWlyZGdmZndvZGtiY3N0ZGZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI4Mjg3MCwiZXhwIjoyMDU5ODU4ODcwfQ.YOUR_ACTUAL_KEY
   ```

7. **Save the file**

8. **Restart the backend server:**
   - In the terminal running the backend, press `Ctrl+C`
   - Run `npm run dev` again

9. **Refresh your browser** at http://localhost:5173

## Now the buttons will work!

- ✅ Create Agent button will save to database
- ✅ Delete Agent button will remove from database
- ✅ Toggle status will update in database
- ✅ Same for Flows and Templates

All your data will be stored in Supabase and persist between sessions!
