import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  
  // Header elements
  readonly header: Locator;
  readonly settingsDropdown: Locator;
  readonly jarvisVoiceButton: Locator;
  readonly themeToggle: Locator;
  
  // Dashboard cards
  readonly dailyCallCard: Locator;
  readonly dailyBriefingCard: Locator;
  readonly billsCard: Locator;
  readonly calendarCard: Locator;
  readonly emailCard: Locator;
  
  // Daily Call Widget
  readonly dailyCallToggle: Locator;
  readonly dailyCallEditButton: Locator;
  readonly dailyCallTestButton: Locator;
  readonly phoneNumberInput: Locator;
  readonly callTimeSelect: Locator;
  readonly voiceSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  
  // Bills Modal
  readonly billsModalTrigger: Locator;
  readonly billsModal: Locator;
  readonly addBillButton: Locator;
  readonly billNameInput: Locator;
  readonly billAmountInput: Locator;
  readonly billDueDateInput: Locator;
  readonly billFrequencySelect: Locator;
  readonly billCategorySelect: Locator;
  readonly submitBillButton: Locator;
  
  // JARVIS Voice Interface
  readonly jarvisModal: Locator;
  readonly voiceCommandInput: Locator;
  readonly voiceResponse: Locator;
  readonly microphoneButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Header elements
    this.header = page.locator('header');
    this.settingsDropdown = page.locator('[data-testid="settings-dropdown"]');
    this.jarvisVoiceButton = page.locator('[data-testid="jarvis-voice-button"]');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    // Dashboard cards
    this.dailyCallCard = page.locator('[data-testid="daily-call-card"]');
    this.dailyBriefingCard = page.locator('[data-testid="daily-briefing-card"]');
    this.billsCard = page.locator('[data-testid="bills-card"]');
    this.calendarCard = page.locator('[data-testid="calendar-card"]');
    this.emailCard = page.locator('[data-testid="email-card"]');
    
    // Daily Call Widget
    this.dailyCallToggle = page.locator('[data-testid="daily-call-toggle"]');
    this.dailyCallEditButton = page.locator('[data-testid="daily-call-edit"]');
    this.dailyCallTestButton = page.locator('[data-testid="daily-call-test"]');
    this.phoneNumberInput = page.locator('input[name="phoneNumber"]');
    this.callTimeSelect = page.locator('select[name="time"]');
    this.voiceSelect = page.locator('select[name="voice"]');
    this.saveButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('[data-testid="cancel-edit"]');
    
    // Bills Modal
    this.billsModalTrigger = page.locator('[data-testid="bills-modal-trigger"]');
    this.billsModal = page.locator('[data-testid="bills-modal"]');
    this.addBillButton = page.locator('[data-testid="add-bill-button"]');
    this.billNameInput = page.locator('input[name="name"]');
    this.billAmountInput = page.locator('input[name="amount"]');
    this.billDueDateInput = page.locator('input[name="dueDate"]');
    this.billFrequencySelect = page.locator('select[name="frequency"]');
    this.billCategorySelect = page.locator('select[name="category"]');
    this.submitBillButton = page.locator('button[type="submit"]');
    
    // JARVIS Voice Interface
    this.jarvisModal = page.locator('[data-testid="jarvis-modal"]');
    this.voiceCommandInput = page.locator('[data-testid="voice-command-input"]');
    this.voiceResponse = page.locator('[data-testid="voice-response"]');
    this.microphoneButton = page.locator('[data-testid="microphone-button"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDashboardLoad() {
    await expect(this.dailyCallCard).toBeVisible();
    await expect(this.billsCard).toBeVisible();
    await expect(this.calendarCard).toBeVisible();
    await expect(this.emailCard).toBeVisible();
  }

  // Daily Call Widget Actions
  async editDailyCallSettings() {
    await this.dailyCallEditButton.click();
    await expect(this.phoneNumberInput).toBeVisible();
  }

  async fillDailyCallForm(data: {
    phoneNumber: string;
    time: string;
    voice: string;
    enabled: boolean;
  }) {
    await this.phoneNumberInput.fill(data.phoneNumber);
    await this.callTimeSelect.selectOption(data.time);
    await this.voiceSelect.selectOption(data.voice);
    
    if (data.enabled) {
      await this.dailyCallToggle.check();
    } else {
      await this.dailyCallToggle.uncheck();
    }
  }

  async saveDailyCallSettings() {
    await this.saveButton.click();
    await expect(this.phoneNumberInput).not.toBeVisible();
  }

  async testDailyCall() {
    await this.dailyCallTestButton.click();
    // Wait for test call confirmation or error message
    await this.page.waitForTimeout(2000);
  }

  // Bills Management Actions
  async openBillsModal() {
    await this.billsModalTrigger.click();
    await expect(this.billsModal).toBeVisible();
  }

  async addNewBill(billData: {
    name: string;
    amount: string;
    dueDate: string;
    frequency: string;
    category: string;
  }) {
    await this.addBillButton.click();
    await this.billNameInput.fill(billData.name);
    await this.billAmountInput.fill(billData.amount);
    await this.billDueDateInput.fill(billData.dueDate);
    await this.billFrequencySelect.selectOption(billData.frequency);
    await this.billCategorySelect.selectOption(billData.category);
    await this.submitBillButton.click();
  }

  // JARVIS Voice Actions
  async openJarvisVoice() {
    await this.jarvisVoiceButton.click();
    await expect(this.jarvisModal).toBeVisible();
  }

  async sendVoiceCommand(command: string) {
    await this.voiceCommandInput.fill(command);
    await this.voiceCommandInput.press('Enter');
    await expect(this.voiceResponse).toBeVisible();
  }

  // Theme and Settings
  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(500); // Wait for theme transition
  }

  async openSettings() {
    await this.settingsDropdown.click();
  }

  // Validation helpers
  async expectDashboardToBeLoaded() {
    await this.waitForDashboardLoad();
    await expect(this.page).toHaveTitle(/AI Daily Assistant/);
  }

  async expectDailyCallEnabled() {
    await expect(this.dailyCallToggle).toBeChecked();
  }

  async expectBillInList(billName: string) {
    await expect(this.page.locator(`text=${billName}`)).toBeVisible();
  }
}
