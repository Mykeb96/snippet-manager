import { test, expect } from '@playwright/test'
import { Page } from '@playwright/test'

import { 
    makeUniqueUser, 
    fillEmail, 
    fillPassword, 
    fillUsername, 
    clickRegister, 
    clickSignIn,
    signInAsAdmin,
    signInAsUser
  } from './helpers/auth-helpers'

const BASE_URL = 'http://localhost:5173'

test.describe('Access control', () => {
    test.beforeEach(async ({ page }) => {
        page.goto(`${BASE_URL}/auth`)
    })

    
})