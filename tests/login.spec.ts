import { test, expect } from '@playwright/test';
import path from 'path';

// Seed test so the repo is green before the live demo.
// During the demo, Claude extends this file from demo/requirement.md.
const LOGIN_PAGE = 'file://' + path.resolve(__dirname, '../demo/app/login.html');

const VALID_EMAIL = 'traveller@example.com';
const VALID_PASSWORD = 'Test-Pass-123'; // fixture value from demo/app/login.html — not a real credential

test.describe('Traveller sign-in (TD-142)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_PAGE);
  });

  test('[positive] signs in with valid credentials and shows welcome message', async ({ page }) => {
    await page.getByLabel('Email').fill(VALID_EMAIL);
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Welcome back, traveller!')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('');
  });

  test('[negative] shows required error when email is empty', async ({ page }) => {
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Email is required.');
  });
});
