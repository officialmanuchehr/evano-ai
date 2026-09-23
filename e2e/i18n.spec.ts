import { test, expect } from '@playwright/test'
import { admin, newTestUser, getProfile, cleanupTestUsers } from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Interface language (EN / RU)
// =============================================================================
test('language switch changes the site to Russian and remembers it', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Never miss a customer call again.')

  await page.getByRole('group', { name: 'Interface language' }).first().getByRole('button', { name: 'ru' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Больше ни одного пропущенного звонка')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

  // Remembered on other pages
  await page.goto('/auth/login')
  await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible()

  // …and back to English
  await page.getByRole('group', { name: 'Язык интерфейса' }).getByRole('button', { name: 'en' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test.describe('with a Russian browser', () => {
  test.use({ locale: 'ru-RU' })

  test('first visit is in Russian, errors are in Russian', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.getByRole('heading', { name: 'Создайте аккаунт' })).toBeVisible()

    await page.getByLabel('Имя и фамилия').fill('Тест Тестов')
    await page.getByLabel('Электронная почта').fill(`e2e.ru.${Date.now()}@evano-test.dev`)
    await page.getByLabel('Пароль').fill('short')
    await page.getByRole('button', { name: 'Создать аккаунт' }).click()
    await expect(page.getByText('Пароль должен быть не короче 8 символов')).toBeVisible()
  })

  test('signing up in Russian gives a Russian receptionist and dashboard', async ({ page }) => {
    test.setTimeout(120_000)
    const user = { ...newTestUser(), fullName: 'Анна Иванова' }

    await page.goto('/auth/register')
    await page.getByLabel('Имя и фамилия').fill(user.fullName)
    await page.getByLabel('Электронная почта').fill(user.email)
    await page.getByLabel('Пароль').fill(user.password)
    await page.getByRole('button', { name: 'Создать аккаунт' }).click()

    // Onboarding in Russian
    await expect(page).toHaveURL(/\/onboarding\/business/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Расскажите о своём бизнесе' })).toBeVisible()
    await expect(page.getByLabel('Название бизнеса')).toHaveValue('Бизнес Анна Иванова')
    await page.getByLabel('Сфера').selectOption('Dental')
    await expect(page.getByLabel('Сфера').locator('option:checked')).toHaveText('Стоматология')
    await page.getByRole('button', { name: 'Продолжить' }).click()
    await expect(page).toHaveURL(/\/onboarding\/hours/, { timeout: 15_000 })
    await expect(page.getByText('Понедельник')).toBeVisible()
    await page.getByRole('button', { name: 'Продолжить' }).click()
    await expect(page).toHaveURL(/\/onboarding\/services/, { timeout: 15_000 })
    await page.getByRole('button', { name: 'Завершить настройку' }).click()

    // Dashboard in Russian
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Звонки' })).toBeVisible()
    await expect(page.getByText('Звонков сегодня')).toBeVisible()

    // The receptionist defaults to Russian, with a Russian greeting and voice list
    const { organization_id } = await getProfile(user.email)
    const { data: agent } = await admin.from('ai_agents').select('name, language, greeting').eq('organization_id', organization_id).single()
    expect(agent).toEqual({
      name: 'ИИ-администратор',
      language: 'multi-ru-en',
      greeting: 'Здравствуйте! Вы позвонили в Бизнес Анна Иванова. Чем могу помочь?',
    })
    await page.locator('aside').getByRole('link', { name: 'ИИ-администратор' }).click()
    await expect(page.getByLabel('Голос').locator('option')).toHaveText(['Ava (female)', 'Emma (female)', 'Andrew (male)', 'Brian (male)'])
  })
})
