import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:3000/__e2e/reset')
  await page.addInitScript(() => {
    localStorage.setItem('login/token', JSON.stringify('e2e-token'))
  })
  await page.goto('/consultation')
})

test('SSE 回复在连接结束前增量显示', async ({ page }) => {
  await page.getByPlaceholder('请输入您想分享的内容...').fill('增量回复')
  await page.getByTestId('send-message').click()

  const aiReply = page.locator('.ai-message').last()
  await expect(aiReply).toContainText('第一段')
  await expect(aiReply).not.toContainText('第二段')
  await expect(aiReply).toContainText('第一段第二段')
})

test('跨数据块的 SSE 事件和中文字符仍能完整解析', async ({ page }) => {
  await page.getByPlaceholder('请输入您想分享的内容...').fill('拆分中文')
  await page.getByTestId('send-message').click()

  await expect(page.locator('.ai-message').last()).toContainText('中文完整')
})

test('连续触发发送只创建一次流式请求', async ({ page, request }) => {
  await page.getByPlaceholder('请输入您想分享的内容...').fill('慢速回复')
  const box = await page.getByTestId('send-message').boundingBox()
  if (!box) throw new Error('发送按钮不可见')

  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByText('已经生成的部分')).toBeVisible()

  const state = await request.get('http://127.0.0.1:3000/__e2e/state').then((response) => response.json())
  expect(state.aiRequests).toHaveLength(1)
  await expect(page.getByText('慢速回复', { exact: true })).toHaveCount(1)
})

test('正常结束后恢复发送状态并仅保存一次完整回复', async ({ page, request }) => {
  const input = page.getByPlaceholder('请输入您想分享的内容...')
  await input.fill('普通回复')
  await page.getByTestId('send-message').click()

  await expect(page.locator('.ai-message').last()).toContainText('完整回复')
  await expect(input).toBeEnabled()

  const state = await request.get('http://127.0.0.1:3000/__e2e/state').then((response) => response.json())
  expect(state.aiSaves).toEqual([{ senderType: 2, content: '完整回复' }])
})

test('用户可以停止生成并保留已收到的回复', async ({ page, request }) => {
  await page.getByPlaceholder('请输入您想分享的内容...').fill('慢速回复')
  await page.getByTestId('send-message').click()

  await expect(page.getByText('已经生成的部分')).toBeVisible()
  await page.getByRole('button', { name: '停止生成' }).click()

  await expect(page.getByText('已经生成的部分')).toBeVisible()
  await expect(page.getByText('已停止生成')).toBeVisible()
  await expect(page.getByPlaceholder('请输入您想分享的内容...')).toBeEnabled()
  await page.getByPlaceholder('请输入您想分享的内容...').fill('下一条消息')
  await expect(page.getByTestId('send-message')).toBeEnabled()

  await expect
    .poll(async () => {
      const state = await request.get('http://127.0.0.1:3000/__e2e/state').then((response) => response.json())
      return { closedStreams: state.closedStreams, aiSaves: state.aiSaves.length }
    })
    .toEqual({ closedStreams: 1, aiSaves: 0 })
})

test('中断回复不会进入下一轮上下文且可以继续发送', async ({ page }) => {
  const input = page.getByPlaceholder('请输入您想分享的内容...')
  await input.fill('慢速回复')
  await page.getByTestId('send-message').click()
  await expect(page.getByText('已经生成的部分')).toBeVisible()
  await page.getByRole('button', { name: '停止生成' }).click()

  await input.fill('检查上下文')
  await page.getByTestId('send-message').click()

  await expect(page.locator('.ai-message').last()).toContainText('上下文干净')
})

test('上游断流后显示错误并恢复发送状态', async ({ page, request }) => {
  const input = page.getByPlaceholder('请输入您想分享的内容...')
  await input.fill('异常断流')
  await page.getByTestId('send-message').click()

  await expect(page.locator('.error-message')).toContainText('流式响应意外中断')
  await expect(input).toBeEnabled()
  await input.fill('可以重试')
  await expect(page.getByTestId('send-message')).toBeEnabled()

  const state = await request.get('http://127.0.0.1:3000/__e2e/state').then((response) => response.json())
  expect(state.aiSaves).toHaveLength(0)
})

test('JSON 业务错误可恢复且页面离开会关闭流式请求', async ({ page, request }) => {
  const input = page.getByPlaceholder('请输入您想分享的内容...')
  await input.fill('业务错误')
  await page.getByTestId('send-message').click()

  await expect(page.locator('.error-message')).toContainText('模拟业务错误')
  await expect(input).toBeEnabled()

  await input.fill('慢速回复')
  await page.getByTestId('send-message').click()
  await expect(page.getByText('已经生成的部分')).toBeVisible()
  await page.goto('/')

  await expect
    .poll(async () => {
      const state = await request.get('http://127.0.0.1:3000/__e2e/state').then((response) => response.json())
      return state.closedStreams
    })
    .toBe(1)
})
