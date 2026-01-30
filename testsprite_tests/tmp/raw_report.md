
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** luminescent-sojourner
- **Date:** 2026-01-23
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Successful login with valid email and password
- **Test Code:** [TC001_Successful_login_with_valid_email_and_password.py](./TC001_Successful_login_with_valid_email_and_password.py)
- **Test Error:** Login test failed: valid credentials were rejected with 'Invalid login credentials' error message. Unable to verify successful login and dashboard access.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/3e293a3f-c6c1-4661-a83a-5950676263d6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Login failure with invalid credentials
- **Test Code:** [TC002_Login_failure_with_invalid_credentials.py](./TC002_Login_failure_with_invalid_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/9746f890-cf6a-40a2-b205-5e0ee928a368
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Access blocked when subscription is expired
- **Test Code:** [TC003_Access_blocked_when_subscription_is_expired.py](./TC003_Access_blocked_when_subscription_is_expired.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/e508e31a-6ac3-4ea2-8c81-7a242c42442e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Display free and occupied time slots correctly on calendar
- **Test Code:** [TC004_Display_free_and_occupied_time_slots_correctly_on_calendar.py](./TC004_Display_free_and_occupied_time_slots_correctly_on_calendar.py)
- **Test Error:** Unable to proceed with testing calendar interface due to persistent login failures and account creation errors. Reported the issue and stopped further actions.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[ERROR] TypeError: Failed to fetch
    at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=379b0608:7224:23
    at _handleRequest2 (http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=379b0608:7514:20)
    at _request (http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=379b0608:7504:22)
    at SupabaseAuthClient.signUp (http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=379b0608:9203:21)
    at handleSignUp (http://localhost:5173/src/pages/Register.tsx:23:70)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=379b0608:13622:11)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=379b0608:997:72)
    at processDispatchQueue (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=379b0608:13658:37)
    at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=379b0608:14071:11
    at batchedUpdates$1 (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=379b0608:2626:42) (at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=379b0608:7515:12)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/54c8e704-f9fd-438f-ae2d-e1c51af61ca9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Create new appointment on the calendar
- **Test Code:** [TC005_Create_new_appointment_on_the_calendar.py](./TC005_Create_new_appointment_on_the_calendar.py)
- **Test Error:** The task to verify that a user can create a new appointment in an available time slot within the calendar interface could not be fully completed. Multiple attempts were made to log in and create new accounts, but all login attempts were blocked due to unconfirmed email addresses. Without successful login and access to the agenda page, it was not possible to select a free time slot, create an appointment, or verify its appearance on the calendar. The task remains incomplete due to these access restrictions.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/73848fe6-dbe5-4c77-b659-42a7b69ed289
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Edit existing appointment details
- **Test Code:** [TC006_Edit_existing_appointment_details.py](./TC006_Edit_existing_appointment_details.py)
- **Test Error:** Unable to proceed with appointment editing task due to invalid login credentials. Both provided test credentials failed to login. No password reset or alternative login options are available. Please provide valid login credentials or access to a test account to continue.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/08386494-9bbc-4170-b2e1-6175951c605a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Create new patient record with mandatory information
- **Test Code:** [TC007_Create_new_patient_record_with_mandatory_information.py](./TC007_Create_new_patient_record_with_mandatory_information.py)
- **Test Error:** Login failed with 'Invalid login credentials' error. Unable to access patient management page to verify adding new patient. Stopping further testing until login issue is resolved.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/b15e7a20-244f-4b2d-b591-1ff331c4b4da
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 View detailed patient information including history
- **Test Code:** [TC008_View_detailed_patient_information_including_history.py](./TC008_View_detailed_patient_information_including_history.py)
- **Test Error:** Login attempts failed due to invalid credentials error. Unable to proceed to patient management page to verify patient details and history. Please provide valid login credentials or alternative access method.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/4a5409d3-a078-46d3-95b7-ce0bedb7f89d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Attempt to add patient with missing mandatory fields
- **Test Code:** [TC009_Attempt_to_add_patient_with_missing_mandatory_fields.py](./TC009_Attempt_to_add_patient_with_missing_mandatory_fields.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/97ecfddb-f004-479d-8247-12552c9aef72
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Record a new financial expense with category
- **Test Code:** [TC010_Record_a_new_financial_expense_with_category.py](./TC010_Record_a_new_financial_expense_with_category.py)
- **Test Error:** The user successfully registered a new account with valid details but was unable to log in due to the 'Email not confirmed' error. Therefore, the task to verify that users can record a new financial expense and assign it to the correct category could not be fully completed. Email confirmation is required to proceed with login and access the financial management page for expense recording.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/d16e81af-825a-4c6a-ac29-ace44b5b47ee
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 View financial reports and categorized expense summaries
- **Test Code:** [TC011_View_financial_reports_and_categorized_expense_summaries.py](./TC011_View_financial_reports_and_categorized_expense_summaries.py)
- **Test Error:** Unable to proceed with verifying the financial dashboard due to registration form email validation error blocking account creation. Reporting the issue and stopping further actions.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/c71487b2-3791-4b58-b6c9-da3e79bec92c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Update user personal settings successfully
- **Test Code:** [TC012_Update_user_personal_settings_successfully.py](./TC012_Update_user_personal_settings_successfully.py)
- **Test Error:** Stopped testing due to persistent invalid email validation error on registration form preventing account creation and further progress.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/96b86158-7ac2-446c-974a-216ca42c175b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Update clinic profile settings with validation
- **Test Code:** [TC013_Update_clinic_profile_settings_with_validation.py](./TC013_Update_clinic_profile_settings_with_validation.py)
- **Test Error:** Cannot proceed with verifying clinic profile settings update because login failed with invalid credentials error. Reporting issue and stopping further actions.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/1dc09a27-2249-485c-89f7-554e80ddd1ff
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Prevent saving clinic settings with invalid data
- **Test Code:** [TC014_Prevent_saving_clinic_settings_with_invalid_data.py](./TC014_Prevent_saving_clinic_settings_with_invalid_data.py)
- **Test Error:** Login failed with 'Invalid login credentials' error. Cannot proceed to clinic profile settings to verify validation errors on invalid clinic profile data. Reporting issue and stopping further testing.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/4d5f13d7-55df-48f9-9f50-f353e7d21f3b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Administrator manages user accounts
- **Test Code:** [TC015_Administrator_manages_user_accounts.py](./TC015_Administrator_manages_user_accounts.py)
- **Test Error:** Unable to proceed with the task due to a persistent email validation error in the registration form that blocks creating a new admin account. No valid administrator credentials are available to login and access the admin panel. Recommend fixing this bug or providing valid admin credentials to continue testing.
Browser Console Logs:
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
[ERROR] Pattern attribute value [a-zA-Z0-9_.-]+ is not a valid regular expression: Uncaught SyntaxError: Invalid regular expression: /[a-zA-Z0-9_.-]+/v: Invalid character in character class (at http://localhost:5173/register:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://jnbtizhtrerotvmmuxzw.supabase.co/auth/v1/signup:0:0)
[WARNING] Forcing app load due to timeout (at http://localhost:5173/src/contexts/AuthContext.tsx:56:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1689d03e-722b-4a30-8f05-63f2f6a4a5d6/6932988f-721d-4186-a703-7705862bb1e1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **20.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---