# 词汇管理系统API接口总结

## 后端API接口

### 词汇级别(Vocabulary Levels)相关接口

1. **获取所有词汇级别**
   - 端点: `GET /api/vocabulary-levels`
   - 描述: 获取系统中所有可用的词汇级别
   - 返回: `{success: true, levels: [...]}`
   - 前端使用: 用于初始化级别下拉框、筛选单词和章节

2. **获取特定级别的章节**
   - 端点: `GET /api/vocabulary-levels/:levelIdOrName/chapters`
   - 描述: 获取指定词汇级别下的所有章节
   - 返回: `{success: true, chapters: [...]}`
   - 前端使用: 当用户选择级别时，加载该级别下的所有章节

### 章节(Chapters)相关接口

1. **获取所有章节**
   - 端点: `GET /api/chapters`
   - 描述: 获取所有章节，可用于初始化
   - 返回: 章节数组

2. **获取章节的单词**
   - 端点: `GET /api/chapters/:chapterId/words`
   - 描述: 获取指定章节中的所有单词
   - 返回: 单词数组
   - 前端使用: 当用户选择特定章节时，加载该章节的单词进行学习

3. **创建新章节**
   - 端点: `POST /api/chapters`
   - 描述: 创建新的章节
   - 参数: `{name, description, level_id, order_num}`
   - 返回: `{success: true, chapter: {...}}`
   - 前端使用: 管理员添加新章节时使用

### 单词(Words)相关接口

1. **添加单词**
   - 端点: `POST /api/words`
   - 描述: 添加新单词到数据库
   - 参数: `{word, meaning, phonetic, phrase, example, morphology, note, level_id, chapter_id, image_path}`
   - 返回: `{success: true, wordId: 123}`
   - 前端使用: 在单词管理界面添加新单词

2. **更新单词**
   - 端点: `PUT /api/words/:id`
   - 描述: 更新现有单词信息
   - 参数: `{word, phonetic, definition, chapter_id}`
   - 返回: `{success: true, message: '单词更新成功'}`
   - 前端使用: 在单词管理界面编辑单词

3. **删除单词**
   - 端点: `DELETE /api/words/:id`
   - 描述: 删除单词及其映射关系
   - 返回: `{success: true, message: '单词删除成功'}`
   - 前端使用: 在单词管理界面删除单词

4. **搜索单词**
   - 端点: `GET /api/words/search`
   - 描述: 按关键词搜索单词
   - 参数: `q`(查询参数)
   - 返回: 匹配的单词数组
   - 前端使用: 在单词管理界面搜索单词

5. **批量导入单词**
   - 端点: `POST /api/words/bulk-import`
   - 描述: 批量导入单词数据
   - 参数: `{jsonData}`(JSON格式的单词数组)
   - 返回: `{success: true, imported: 100}`
   - 前端使用: 从Excel导入单词时使用

## 前端实现

### 词汇管理页面主要功能

1. **词汇级别管理**
   - 查看所有级别
   - 添加新级别
   - 编辑和删除级别

2. **章节管理**
   - 按级别筛选查看章节
   - 添加新章节
   - 编辑和删除章节

3. **单词管理**
   - 按级别和章节筛选单词
   - 添加、编辑和删除单词
   - 搜索单词
   - 批量导入单词(通过Excel)

### API调用实现

前端使用的API基础URL配置:
```javascript
const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':5000/api';
```

API端点配置:
```javascript
const API_ENDPOINTS = {
    VOCABULARY_LEVELS: '/vocabulary-levels',
    LEVEL_CHAPTERS: '/vocabulary-levels/{id}/chapters',
    CHAPTERS: '/chapters',
    WORDS: '/chapters/{id}/words',
    IMPORT_WORDS: '/import-words',
    WORDS_SEARCH: '/words/search',
    WORDS_MANAGE: '/words',
    CREATE_CHAPTER: '/chapters'
};
```

所有API调用都使用fetch方法实现，并在请求头中包含token进行身份验证:
```javascript
fetch(url, {
    method: method,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(requestData)
})
```

## 数据结构

1. **词汇级别(VocabularyLevels)**
   - id: 唯一标识符
   - name: 级别名称(如"考研英语")
   - description: 级别描述
   - order_num: 排序序号

2. **章节(Chapters)**
   - id: 唯一标识符
   - name: 章节名称
   - description: 章节描述
   - order_num: 排序序号
   - level_id: 关联的词汇级别ID

3. **单词(Words)**
   - id: 唯一标识符
   - word: 单词本身
   - meaning/definition: 单词含义
   - phonetic: 音标
   - phrase: 短语示例
   - example: 使用示例
   - morphology: 词形变化
   - note: 备注
   - level_id: 关联的词汇级别ID
   - chapter_id: 关联的章节ID
   - image_path: 图片路径(可选)


Users 表
id (主键)
username
password_hash 
user_type
email
created_at
last_login

Categories 表 (你提到这是你实际使用的词汇级别表)
id
name
description
order_num

Chapters 表
id (主键)
name
description
order_num
level_id (应该引用Categories.id)
created_at

Words 表
id (主键)
word
meaning
phonetic
phrase
example
morphology
note
level_id   （text类型）
chapter_id     （text类型）
image_path
created_at

UserPermissions 表
id (主键)
user_id
category_id
has_access
created_at

UserProgress 表
id (主键)
user_id
platform
module_type
related_id
progress
last_updated

## 注意事项

1. 前端存在部分不完整的函数实现，需要根据API接口要求进行补充完善
2. 单词表单中的字段名需要与后端API期望的字段保持一致(例如使用meaning而不是definition)
3. 章节ID可能在不同词汇级别间重复，导致冲突，需要确保唯一性
4. 级别切换时需要重新加载对应的章节列表
5. 单词保存时需要处理编辑和新增两种不同情况 



admin-vocabulary.js 详细功能分析
1. 初始化与设置模块
initializeMaterialize() (行 56):
初始化所有 Materialize CSS 组件，包括下拉菜单、模态框、标签页等
确保 UI 组件具有正确的交互行为和视觉效果
checkLoginStatus() (行 81):
验证用户是否已登录
检查 localStorage 中的 authToken
如果未登录，重定向到登录页面
解析 JWT 令牌获取用户信息
setupEventListeners() (行 120):
为页面上的各种元素添加事件监听器
设置表单提交、按钮点击、输入变化等事件处理
包括词汇级别、章节和单词的增删改查事件
设置 Excel 导入、搜索和分页的事件处理
loadInitialData() (行 166):
应用程序初始化时加载必要数据
获取词汇级别、章节列表等
初始化下拉菜单和表格
显示初始单词列表
2. 级别管理模块
loadVocabularyLevels() (行 196):
从 API 获取所有词汇级别
处理响应数据并存储在全局变量中
更新 UI 中的级别下拉菜单
处理错误情况并显示提示
updateLevelDropdowns() (行 238):
更新页面上所有级别相关的下拉选择框
确保所有涉及级别选择的 UI 组件保持同步
应用 Materialize 样式更新
saveLevel() (行 1772):
收集级别表单数据(名称、描述、顺序号等)
验证数据完整性和有效性
根据是否有 ID 决定创建新级别或更新现有级别
发送 API 请求并处理响应
更新 UI 并显示操作结果
deleteLevel() (行 2138):
发送删除级别的 API 请求
确认删除操作成功
重新加载级别列表
更新所有相关 UI 组件
showAddLevelModal() (行 1684):
重置级别表单
清空所有字段值
设置模态框标题为"添加新级别"
显示添加级别的模态框
editLevel() (行 1704):
填充级别表单数据
A 设置模态框标题为"编辑级别"
打开编辑级别的模态框
预填充现有级别数据
3. 章节管理模块
loadChaptersByLevel() (行 2410):
根据级别 ID 请求对应章节数据
清空现有章节选项
检查是否有章节数据
如果没有章节:
显示提示消息
添加"创建章节"按钮
显示 toast 通知
如果有章节:
填充章节下拉菜单
重新初始化 Materialize 下拉组件
处理可能的错误情况
updateChapterDropdown() (行 272):
响应级别选择变化
清空现有章节选项
加载新选定级别的章节
处理 API 错误
刷新 UI 组件
loadChapters() (行 1934):
加载章节数据，支持筛选条件
构建请求 URL，添加筛选参数
发送 API 请求获取章节列表
清空并重建章节表格
显示章节数据或"暂无章节数据"提示
saveChapter() (行 1850):
收集章节表单数据(名称、描述、级别 ID 等)
验证数据完整性
根据是否有 ID 决定创建或更新章节
发送 API 请求并处理响应
刷新章节列表和下拉菜单
deleteChapter() (行 1324):
发送删除章节的 API 请求
处理响应和错误
重新加载章节列表
更新相关 UI 组件
createChapter() (行 1126):
创建新章节的专用函数
构建章节数据
发送 API 请求
返回 Promise 以支持链式调用
处理成功和失败情况
4. 单词管理模块
loadWords() (行 383):
加载单词列表，支持分页和筛选
构建请求 URL，包含分页参数和筛选条件
发送 API 请求获取单词数据
处理响应和错误
调用 displayWords 显示结果
displayWords() (行 473/2210):
两个版本适用于不同场景
清空现有表格内容
格式化单词数据，确保所有字段存在
创建表格行和单元格
添加编辑和删除按钮
设置事件监听器
处理空数据情况
更新分页控件
saveWord() (行 1449):
收集单词表单数据(单词、音标、含义等)
验证必填字段(单词、含义、章节 ID)
根据是否有 ID 决定创建或更新单词
发送 API 请求
处理响应和错误
刷新单词列表
deleteWord() (行 2105):
发送删除单词的 API 请求
确认删除操作成功
重新加载单词列表
显示操作结果通知
showAddWordModal() (行 1612):
重置单词表单
清空所有字段(单词、音标、定义、短语、例句、词形变化、备注)
更新文本字段
设置模态框标题为"添加新单词"
打开添加单词的模态框
editWord() (行 1641):
填充单词表单数据
设置单词 ID 用于标识更新操作
设置模态框标题为"编辑单词"
打开编辑单词的模态框
使用现有单词数据预填充表单
5. Excel 导入功能模块
handleExcelUpload() (行 912):
处理 Excel 文件上传事件
检查文件类型和大小
使用 SheetJS 读取 Excel 文件内容
提取并格式化单词数据
验证数据有效性
更新 Excel 预览区域
updateExcelPreview() (行 1061):
创建预览表格
显示从 Excel 提取的单词数据
添加表头和数据行
提供可视化反馈
validateExcelData() (行 1556):
验证 Excel 数据格式和内容
检查必填字段(单词、含义)
收集并返回验证错误信息
确保数据可安全导入
showValidationErrors() (行 1583):
显示 Excel 数据验证错误
创建错误消息 HTML
在预览区域添加错误提示
帮助用户理解并修正数据问题
importExcelData() (行 1246):
从预览中获取验证后的数据
检查选定的章节
调用 importWordsToChapter 执行导入
处理导入结果
显示成功或失败通知
importWordsToChapter() (行 1182):
格式化词汇数据以符合 API 要求
发送批量导入 API 请求
处理服务器响应
通知导入成功或失败
刷新单词列表显示新导入的单词
6. 界面交互模块
updatePagination() (行 620):
创建或更新分页控件
计算页码范围
添加上一页/下一页按钮
设置当前页高亮
添加页码点击事件处理
handlePageChange() (行 708):
处理分页控件点击
计算新的页码
验证页码范围
加载指定页的数据
更新 UI 状态
filterWords() (行 740):
获取筛选条件(级别、章节)
构建筛选对象
调用 loadWords 加载筛选后的数据
重置分页到第一页
filterChapters() (行 2051):
获取级别筛选条件
构建过滤条件对象
调用 loadChapters 重新加载章节列表
应用筛选结果
showDeleteConfirmation() (行 2069):
显示删除确认对话框
区分不同类型(单词/级别/章节)
设置确认消息
添加确认和取消按钮
设置确认操作的回调函数
showLoading()/hideLoading() (行 855/866):
显示/隐藏加载动画
设置加载提示文本
提供视觉反馈
防止用户在处理过程中进行操作
showToast() (行 876):
显示提示消息
支持不同类型(info/success/error)
设置显示时长
提供操作结果反馈
7. API 测试与调试模块
testDirectAPI()/directAPITest() (行 2171/2321):
直接测试 API 连接和响应
绕过常规流程直接请求 API
显示详细 API 响应
提供错误诊断信息
帮助开发者排查 API 问题
8. 数据结构
单词对象结构:
id: 单词 ID
word: 单词本身
phonetic: 音标
meaning: 含义/定义
phrase: 短语
example: 例句
morphology: 词形变化
note: 备注
chapter_id: 所属章节 ID
chapter_name: 章节名称
章节对象结构:
id: 章节 ID
name: 章节名称
description: 章节描述
level_id: 所属级别 ID
order_num: 排序序号
级别对象结构:
id: 级别 ID
name: 级别名称
description: 级别描述
order_num: 排序序号
9. 错误处理机制
使用 try-catch 捕获异步操作错误
使用 Promise.catch 处理 Promise 链错误
针对不同错误类型提供不同反馈
在 UI 中显示友好错误消息
记录详细错误信息到控制台
实现优雅降级和恢复措施
10. API 交互细节
使用 fetch API 进行 HTTP 请求
添加认证头部(Authorization: Bearer ${token})
处理 HTTP 状态码和响应格式
实现请求超时和重试机制
统一处理 API 成功/失败响应格式
