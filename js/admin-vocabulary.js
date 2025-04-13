	/**
	 * 词汇管理系统 JavaScript
	 * 用于管理词汇数据、级别和章节
	 */

	// API基础URL
	const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':5000/api';

	// API端点
	const API_ENDPOINTS = {
		VOCABULARY_LEVELS: '/vocabulary-levels',
		LEVEL_CHAPTERS: '/vocabulary-levels/{id}/chapters',
		CHAPTERS: '/chapters',
		WORDS: '/words',
		IMPORT_WORDS: '/import-words',
		WORDS_SEARCH: '/words/search',
		WORDS_MANAGE: '/words',
		CREATE_CHAPTER: '/chapters'
	};

	// 全局变量
	let token = localStorage.getItem('authToken');
	let currentPage = 1;
	let pageSize = 20;
	let totalWords = 0;
	let vocabularyLevels = [];
	let currentLevelId = null;
	let excelData = null;

	/**
	 * 初始化导入功能
	 */
	function initializeImportFeatures() {
		// 初始化导入类型选择
		const importTypeSelect = document.getElementById('importType');
		if (importTypeSelect) {
			M.FormSelect.init(importTypeSelect);
		}

		// 初始化文件上传监听
		const fileInput = document.getElementById('fileInput');
		if (fileInput) {
			fileInput.addEventListener('change', handleFileUpload);
		}

		// 初始化级别选择
		const levelSelect = document.getElementById('levelSelect');
		if (levelSelect) {
			M.FormSelect.init(levelSelect);
			levelSelect.addEventListener('change', function(e) {
				const customLevelField = document.getElementById('customLevelField');
				if (e.target.value === 'custom') {
					customLevelField.style.display = 'block';
				} else {
					customLevelField.style.display = 'none';
				}
			});
		}

		// 初始化导入按钮
		const importBtn = document.getElementById('importBtn');
		if (importBtn) {
			importBtn.addEventListener('click', importData);
		}

		// 初始化重置按钮
		const resetBtn = document.getElementById('resetBtn');
		if (resetBtn) {
			resetBtn.addEventListener('click', function() {
				// 重置文件输入
				document.getElementById('fileInput').value = '';
				// 重置预览区域
				document.getElementById('previewArea').style.display = 'none';
				// 重置统计数据
				document.getElementById('totalCount').textContent = '0';
				document.getElementById('validCount').textContent = '0';
				document.getElementById('invalidCount').textContent = '0';
				// 重置导入按钮状态
				document.getElementById('importBtn').disabled = true;
				// 清空预览表格
				document.getElementById('previewTableBody').innerHTML = '';
				// 重置全局数据
				excelData = null;
			});
		}
	}

	// 分页状态管理
	const paginationState = {
	  currentPage: 1,     // 当前页码
	  pageSize: 20,       // 每页显示数量
	  totalItems: 0,      // 总记录数
	  
	  // 获取总页数
	  getTotalPages() {
		return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
	  },
	  
	  // 更新状态
	  update(page, size, total) {
		if (page !== undefined) this.currentPage = parseInt(page) || 1;
		if (size !== undefined) this.pageSize = parseInt(size) || 20;
		if (total !== undefined) this.totalItems = parseInt(total) || 0;
		
		console.log(`分页状态已更新: 页码=${this.currentPage}, 每页=${this.pageSize}, 总数=${this.totalItems}, 总页数=${this.getTotalPages()}`);
	  },
	  
	  // 重置到第一页(保留其他参数)
	  reset() {
		this.currentPage = 1;
	  }
	};

	// 预览相关的状态管理
	const previewState = {
		data: [],
		currentPage: 1,
		pageSize: 10,
		totalPages: 1,
		validCount: 0,
		invalidCount: 0
	};

	/**
	 * 页面加载时初始化
	 */
	document.addEventListener('DOMContentLoaded', async function() {
		try {
			// 初始化MaterializeCSS组件
			M.AutoInit();
			
			// 初始化导入功能
			initializeImportFeatures();
			
			// 根据当前页面标签加载相应的词汇级别
			const importTab = document.querySelector('#tab-import');
			if (importTab && importTab.style.display !== 'none') {
				await loadVocabularyLevels('import');
			} else {
				await loadVocabularyLevels('management');
			}
			
			// 为标签切换添加事件监听
			const tabs = document.querySelectorAll('.tabs');
			if (tabs.length > 0) {
				const tabInstance = M.Tabs.init(tabs[0]);
				tabInstance.options.onShow = async function(tab) {
					if (tab.id === 'tab-import') {
						await loadVocabularyLevels('import');
					} else if (tab.id === 'tab-vocabulary') {
						await loadVocabularyLevels('management');
					}
				};
			}
			
			// 初始化其他功能
			setupEventListeners();
			
			// 加载初始数据
			await loadInitialData();
		} catch (error) {
			console.error('初始化失败:', error);
			showToast('初始化失败: ' + error.message, 'error');
		}
	});

	/**
	 * 初始化MaterializeCSS组件
	 */
	function initializeMaterialize() {
		// 初始化下拉框
		const selects = document.querySelectorAll('select');
		M.FormSelect.init(selects, {
			dropdownOptions: {
				container: document.body,  // 将下拉列表添加到body
				constrainWidth: false,     // 允许下拉列表宽度自适应
				coverTrigger: false,       // 下拉列表显示在触发元素下方
				closeOnClick: true,        // 点击选项后关闭
				hover: false,              // 禁用悬停效果
				inDuration: 150,           // 打开动画时长
				outDuration: 150,          // 关闭动画时长
			}
		});

		// 初始化其他组件
		M.Tabs.init(document.querySelectorAll('.tabs'));
		M.Modal.init(document.querySelectorAll('.modal'));
		M.Tooltip.init(document.querySelectorAll('.tooltipped'));
	}

	/**
	 * 检查管理员登录状态
	 */
	function checkLoginStatus() {
		if (!token) {
			// 未登录，重定向到登录页
			showToast('请先登录', 'error');
			setTimeout(() => {
				window.location.href = 'admin.html';
			}, 1500);
			return;
		}
		
		// 验证token
		fetch(API_BASE_URL + '/verify-token', {
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + token
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error('登录已过期');
			}
			return response.json();
		})
		.then(data => {
			console.log('登录状态有效:', data);
		})
		.catch(error => {
			console.error('验证失败:', error);
			showToast('登录已过期，请重新登录', 'error');
			localStorage.removeItem('authToken');
			setTimeout(() => {
				window.location.href = 'admin.html';
			}, 1500);
		});
	}

	/**
	 * 设置页面事件监听器
	 */
	function setupEventListeners() {
		// 退出登录按钮
		const logoutBtn = document.querySelector('.logout-btn');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', handleLogout);
		}

		// 文件上传事件
		const fileInput = document.getElementById('fileInput');
		if (fileInput) {
			fileInput.addEventListener('change', handleFileUpload);
		}

		// 导入按钮事件
		const importBtn = document.getElementById('importBtn');
		if (importBtn) {
			importBtn.addEventListener('click', importData);
		}

		// 重置按钮事件
		const resetBtn = document.getElementById('resetBtn');
		if (resetBtn) {
			resetBtn.addEventListener('click', resetForm);
		}

		// 创建新章节选项切换
		const createNewChapter = document.getElementById('create-new-chapter');
		if (createNewChapter) {
			createNewChapter.addEventListener('change', toggleNewChapterForm);
		}

		// 级别筛选变化时更新章节下拉框
		const importLevelSelect = document.getElementById('import-level-select');
		if (importLevelSelect) {
			importLevelSelect.addEventListener('change', updateChapterDropdown);
		}

		// 级别选择变化时处理自定义级别输入框显示
		const levelSelect = document.getElementById('word-level');
		if (levelSelect) {
			levelSelect.addEventListener('change', function(e) {
				const customLevelContainer = document.getElementById('custom-level-container');
				if (e.target.value === 'custom') {
					customLevelContainer.style.display = 'block';
				} else {
					customLevelContainer.style.display = 'none';
				}
			});
		}

		// 章节选择变化时处理自定义章节输入框显示
		const chapterSelect = document.getElementById('word-chapter');
		if (chapterSelect) {
			chapterSelect.addEventListener('change', function(e) {
				const customChapterContainer = document.getElementById('custom-chapter-container');
				if (e.target.value === 'custom') {
					customChapterContainer.style.display = 'block';
				} else {
					customChapterContainer.style.display = 'none';
				}
			});
		}

		// 确认添加自定义级别
		const confirmCustomLevel = document.getElementById('confirm-custom-level');
		if (confirmCustomLevel) {
			confirmCustomLevel.addEventListener('click', async function() {
				const levelName = document.getElementById('custom-level-name').value.trim();
				const levelDescription = document.getElementById('custom-level-description').value.trim();
				
				if (!levelName) {
					showToast('请输入级别名称', 'error');
					return;
				}

				try {
					showLoading('正在创建新级别...');
					const newLevel = await createLevel(levelName, levelDescription);
					if (newLevel) {
						// 更新级别下拉框
						await loadVocabularyLevels();
						// 选中新创建的级别
						const wordLevel = document.getElementById('word-level');
						if (wordLevel) {
							wordLevel.value = newLevel.id;
							M.FormSelect.init(wordLevel);
						}
						// 隐藏自定义输入框
						document.getElementById('custom-level-container').style.display = 'none';
						showToast('新级别创建成功', 'success');
					}
				} catch (error) {
					console.error('创建级别失败:', error);
					showToast('创建级别失败: ' + error.message, 'error');
				} finally {
					hideLoading();
				}
			});
		}

		// 确认添加自定义章节
		const confirmCustomChapter = document.getElementById('confirm-custom-chapter');
		if (confirmCustomChapter) {
			confirmCustomChapter.addEventListener('click', async function() {
				const chapterName = document.getElementById('custom-chapter-name').value.trim();
				const chapterDescription = document.getElementById('custom-chapter-description').value.trim();
				const levelId = document.getElementById('word-level').value;
				
				if (!chapterName) {
					showToast('请输入章节名称', 'error');
					return;
				}
				
				if (!levelId || levelId === 'custom') {
					showToast('请先选择或创建级别', 'error');
					return;
				}

				try {
					showLoading('正在创建新章节...');
					const newChapter = await createChapter(chapterName, chapterDescription, levelId);
					if (newChapter) {
						// 更新章节下拉框
						await loadChaptersByLevel(levelId);
						// 选中新创建的章节
						const wordChapter = document.getElementById('word-chapter');
						if (wordChapter) {
							wordChapter.value = newChapter.id;
							M.FormSelect.init(wordChapter);
						}
						// 隐藏自定义输入框
						document.getElementById('custom-chapter-container').style.display = 'none';
						showToast('新章节创建成功', 'success');
					}
				} catch (error) {
					console.error('创建章节失败:', error);
					showToast('创建章节失败: ' + error.message, 'error');
				} finally {
					hideLoading();
				}
			});
		}

		// 保存单词按钮
		const saveWordBtn = document.getElementById('btn-save-word');
		if (saveWordBtn) {
			saveWordBtn.addEventListener('click', saveWord);
		}

		// 确认删除按钮
		const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
		if (confirmDeleteBtn) {
			confirmDeleteBtn.addEventListener('click', function() {
				const type = this.dataset.type;
				const id = this.dataset.id;
				
				if (!type || !id) {
					showToast('删除失败：缺少必要参数', 'error');
					return;
				}

				switch (type) {
					case 'word':
						deleteWord(id);
						break;
					case 'level':
						deleteLevel(id);
						break;
					case 'chapter':
						deleteChapter(id);
						break;
					default:
						showToast('未知的删除类型', 'error');
				}
			});
		}

		// 搜索框事件
		const searchInput = document.getElementById('search-input');
		if (searchInput) {
			searchInput.addEventListener('input', debounce(function() {
				filterWords();
			}, 500));
		}

		// 级别筛选事件
		const levelFilter = document.getElementById('level-filter');
		if (levelFilter) {
			levelFilter.addEventListener('change', handleLevelChange);
		}

		// 章节筛选事件
		const chapterFilter = document.getElementById('chapter-filter');
		if (chapterFilter) {
			chapterFilter.addEventListener('change', filterWords);
		}

		// 添加单词按钮
		const addWordBtn = document.getElementById('btn-add-word');
		if (addWordBtn) {
			addWordBtn.addEventListener('click', showAddWordModal);
		}

		// 添加级别按钮
		const addLevelBtn = document.getElementById('btn-add-level');
		if (addLevelBtn) {
			addLevelBtn.addEventListener('click', showAddLevelModal);
		}

		// 添加章节按钮
		const addChapterBtn = document.getElementById('btn-add-chapter');
		if (addChapterBtn) {
			addChapterBtn.addEventListener('click', showAddChapterModal);
		}

		// 导入类型选择事件
		const importType = document.getElementById('importType');
		if (importType) {
			importType.addEventListener('change', function(e) {
				const fileInput = document.getElementById('fileInput');
				if (e.target.value === 'excel') {
					fileInput.accept = '.xlsx,.xls';
				} else {
					fileInput.accept = '.json';
				}
				// 清空已选择的文件
				fileInput.value = '';
				// 重置预览区域
				document.getElementById('previewArea').style.display = 'none';
			});
		}

		// 级别选择事件（导入时）
		const importLevelSelectElement = document.getElementById('levelSelect');
		if (importLevelSelectElement) {
			importLevelSelectElement.addEventListener('change', function(e) {
				const customLevelField = document.getElementById('customLevelField');
				if (e.target.value === 'custom') {
					customLevelField.style.display = 'block';
					document.getElementById('customLevel').focus();
				} else {
					customLevelField.style.display = 'none';
				}
				// 更新导入按钮状态
				const importBtn = document.getElementById('importBtn');
				if (importBtn) {
					importBtn.disabled = !e.target.value || (e.target.value === 'custom' && !document.getElementById('customLevel').value.trim());
				}
			});
		}

		// 自定义级别输入事件
		const customLevelInput = document.getElementById('customLevel');
		if (customLevelInput) {
			customLevelInput.addEventListener('input', function(e) {
				const importBtn = document.getElementById('importBtn');
				if (importBtn) {
					importBtn.disabled = !e.target.value.trim();
				}
			});
		}

		// 分页事件
		const prevPageBtn = document.getElementById('prevPage');
		if (prevPageBtn) {
			prevPageBtn.addEventListener('click', function() {
				if (paginationState.currentPage > 1) {
					handlePageChange(paginationState.currentPage - 1);
				}
			});
		}

		const nextPageBtn = document.getElementById('nextPage');
		if (nextPageBtn) {
			nextPageBtn.addEventListener('click', function() {
				if (paginationState.currentPage < paginationState.getTotalPages()) {
					handlePageChange(paginationState.currentPage + 1);
				}
			});
		}
	}

	/**
	 * 加载初始数据
	 */
	async function loadInitialData() {
		try {
			// 检查登录状态
			const token = localStorage.getItem('authToken');
			if (!token) {
				throw new Error('未登录');
			}

			// 先加载词汇级别
			await loadVocabularyLevels();
			
			// 更新级别下拉框
			await updateLevelDropdowns();
			
			// 初始化分页状态
			paginationState.update(1, 20, 0);
			
			// 加载单词数据
			await loadWords();
			
			return true;
		} catch (error) {
			console.error('加载初始数据失败:', error);
			if (error.message === '未登录') {
				window.location.href = 'login.html';
			}
			return false;
		}
	}

	/**
	 * 加载词汇级别
	 * @param {string} context - 加载上下文，可以是'import'或'management'
	 */
	async function loadVocabularyLevels(context = 'management') {
		try {
			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VOCABULARY_LEVELS}`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			
			if (!response.ok) {
				throw new Error('获取词汇等级失败');
			}
			
			const data = await response.json();
			if (!data.success || !data.levels) {
				throw new Error('获取词汇等级数据格式错误');
			}
			
			// 更新全局变量
			vocabularyLevels = data.levels;
			
			if (context === 'import') {
				// 仅更新导入页面的级别选择框
				const importLevelSelect = document.getElementById('vocabulary-level');
				if (importLevelSelect) {
					// 清空现有选项
					importLevelSelect.innerHTML = '<option value="" disabled selected>选择词汇等级</option>';
					
					// 添加所有等级选项
					data.levels.forEach(level => {
						const option = document.createElement('option');
						option.value = level.id;
						option.textContent = level.name;
						importLevelSelect.appendChild(option);
					});
					
					// 添加自定义选项
					const customOption = document.createElement('option');
					customOption.value = 'custom';
					customOption.textContent = '+ 自定义等级';
					importLevelSelect.appendChild(customOption);
					
					// 初始化Materialize select
					M.FormSelect.init(importLevelSelect);
					
					// 添加事件监听
					if (!importLevelSelect.dataset.hasListener) {
						importLevelSelect.addEventListener('change', handleLevelSelectChange);
						importLevelSelect.dataset.hasListener = 'true';
					}

					// 使用新的配置初始化select
					M.FormSelect.init(importLevelSelect, {
						dropdownOptions: {
							container: document.body,
							constrainWidth: false,
							coverTrigger: false,
							closeOnClick: true,
							hover: false,
							inDuration: 150,
							outDuration: 150
						}
					});
				}
			} else {
				// 更新词汇管理页面的级别选择框
				const managementSelectors = [
					document.getElementById('level-filter'),
					document.getElementById('word-level')
				];
				
				managementSelectors.forEach(levelSelect => {
					if (!levelSelect) return;
					
					// 清空现有选项
					if (levelSelect.id === 'level-filter') {
						// 筛选下拉框添加"所有级别"选项
						levelSelect.innerHTML = '<option value="">所有级别</option>';
					} else {
						// 其他下拉框使用默认的选择提示
						levelSelect.innerHTML = '<option value="" disabled selected>选择词汇等级</option>';
					}
					
					// 添加所有等级选项
					data.levels.forEach(level => {
						const option = document.createElement('option');
						option.value = level.id;
						option.textContent = level.name;
						levelSelect.appendChild(option);
					});
					
					// 初始化Materialize select
					M.FormSelect.init(levelSelect);
				});
			}
			
			return data.levels;
		} catch (error) {
			console.error('加载词汇等级失败:', error);
			showToast('加载词汇等级失败: ' + error.message, 'error');
			return [];
		}
	}

	/**
	 * 处理级别选择变化
	 */
	function handleLevelSelectChange(event) {
		const selectedValue = event.target.value;
		const customLevelInput = document.getElementById('custom-level-input');
		const customLevelDesc = document.getElementById('custom-level-desc');
		
		if (selectedValue === 'custom') {
			if (customLevelInput) customLevelInput.style.display = 'block';
			if (customLevelDesc) customLevelDesc.style.display = 'block';
		} else {
			if (customLevelInput) customLevelInput.style.display = 'none';
			if (customLevelDesc) customLevelDesc.style.display = 'none';
		}
	}

	/**
	 * 更新所有包含级别的下拉菜单
	 * @param {Array} levels - 筛选后的级别数据
	 */
	function updateAllLevelDropdowns(levels) {
		// 获取所有需要更新的级别下拉框
		const levelSelectors = [
			document.getElementById('level-filter'),
			document.getElementById('import-level-select'),
			document.getElementById('word-level'),
			document.getElementById('chapter-level-select')
		];
		
		// 更新每个下拉框
		levelSelectors.forEach(select => {
			if (!select) return;
			
			// 保存当前选中的值
			const currentValue = select.value;
			
			// 清空下拉框，保留第一个选项
			while (select.options.length > 1) {
				select.remove(1);
			}
			
			// 添加级别选项
			levels.forEach(level => {
				const option = document.createElement('option');
				option.value = level.id;
				option.textContent = level.name;
				select.appendChild(option);
			});
			
			// 尝试恢复之前选中的值，如果不存在则使用第一个选项
			if (currentValue && levels.some(level => level.id == currentValue)) {
				select.value = currentValue;
			}
			
			// 更新MaterializeCSS组件
			M.FormSelect.init(select);
		});
	}

	/**
	 * 根据级别ID更新章节下拉框
	 * @param {Event} e - 事件对象
	 */
	function updateChapterDropdown(e) {
		const levelId = e.target.value;
		const chapterSelect = document.getElementById('import-chapter-select');
		
		if (!levelId) {
			// 清空章节选择器
			while (chapterSelect.options.length > 1) {
				chapterSelect.remove(1);
			}
			M.FormSelect.init(chapterSelect);
			return;
		}
		
		// 显示加载指示器
		showLoading('加载章节...');
		
		// 获取该级别的章节
		const url = `${API_BASE_URL}/vocabulary-levels/${levelId}/chapters`;
		
		fetch(url, {
			headers: {
				'Authorization': `Bearer ${localStorage.getItem('authToken')}`
			}
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('获取章节失败');
				}
				return response.json();
			})
			.then(data => {
				// 清空现有选项（保留第一个）
				while (chapterSelect.options.length > 1) {
					chapterSelect.remove(1);
				}
				
				// 添加章节选项
				const chapters = data.chapters || [];
				chapters.forEach(chapter => {
					const option = document.createElement('option');
					option.value = chapter.id;
					option.textContent = chapter.name;
					chapterSelect.appendChild(option);
				});
				
				// 刷新MaterializeCSS组件
				M.FormSelect.init(chapterSelect);
			})
			.catch(error => {
				console.error('加载章节失败:', error);
				showToast('加载章节失败: ' + error.message, 'error');
			})
			.finally(() => {
				hideLoading();
			});
	}

	/**
	 * 更新单词编辑模态框中的章节下拉框
	 * @param {Event} event - 事件对象
	 */
	function updateWordChapterDropdown(event) {
		const levelId = event.target.value;
		const chapterSelect = document.getElementById('word-chapter');
		
		// 如果没有选择级别或者选择的是自定义，则不加载章节
		if (!levelId || levelId === 'custom') {
			return;
		}
		
		// 清空现有选项，只保留第一个默认选项
		while (chapterSelect.options.length > 1) {
			chapterSelect.remove(1);
		}
		
		// 添加创建新章节选项
		const customOption = document.createElement('option');
		customOption.value = 'custom';
		customOption.textContent = '🔸 创建新章节... 🔸';
		customOption.style.fontWeight = 'bold';
		customOption.style.color = '#2196F3';
		chapterSelect.appendChild(customOption);
		
		// 显示加载动画
		showLoading('加载章节...');
		
		// 构建API请求URL
		const url = `${API_BASE_URL}/vocabulary-levels/${levelId}/chapters`;
		
		// 发送API请求
		fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/json'
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error(`获取章节失败: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			hideLoading();
			
			// 处理响应数据
			if (!data.success || !data.chapters || data.chapters.length === 0) {
				console.log(`级别 ${levelId} 没有章节数据`);
				showToast(`提示：该级别还没有章节，您可以创建一个新章节`, 'info');
				return;
			}
			
			// 填充章节下拉框
			data.chapters.forEach(chapter => {
				const option = document.createElement('option');
				option.value = chapter.id;
				// 确保章节名称格式一致，无缝衔接
				option.textContent = chapter.name;
				chapterSelect.appendChild(option);
			});
			
			// 更新选择器
			M.FormSelect.init(chapterSelect);
		})
		.catch(error => {
			hideLoading();
			console.error('加载章节失败:', error);
			showToast('加载章节失败: ' + error.message, 'error');
		});
	}

	/**
	 * 加载单词列表
	 * @param {number} page - 页码
	 * @param {number} size - 每页大小
	 * @param {Object} filters - 过滤条件
	 * @returns {Promise} Promise对象
	 */
	function loadWords(page = 1, size = 20, filters = {}) {
		// 显示加载动画
		showLoading('加载单词...');
		
		// 更新分页状态
		paginationState.update(page, size);
		
		// 构建URL
		let url;
		
		// 根据筛选条件构建URL
		if (filters.chapterId) {
			// 使用章节ID加载单词
			url = `${API_BASE_URL}/chapters/${filters.chapterId}/words`;
		} else if (filters.query) {
			// 搜索功能
			url = `${API_BASE_URL}/words/search?q=${encodeURIComponent(filters.query)}`;
		} else {
			// 加载所有单词
			url = `${API_BASE_URL}/words`;
		}
		
		// 添加分页参数
		url += url.includes('?') ? '&' : '?';
		url += `page=${paginationState.currentPage}&size=${paginationState.pageSize}`;
		
		// 添加级别筛选
		if (filters.levelId) {
			url += `&levelId=${filters.levelId}`;
		}
		
		// 记录API请求URL
		console.log('请求URL:', url);
		
		return fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/json'
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error(`获取单词失败: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			hideLoading();
			
			console.log('API响应:', data);
			
			// 检查是否返回成功
			if (data.success) {
				// 更新分页状态
				paginationState.update(
					data.page || paginationState.currentPage,
					data.size || paginationState.pageSize,
					data.total || (data.words ? data.words.length : 0)
				);
				
				// 显示单词数据
				displayWords(data.words || []);
				return data.words || [];
			} else {
				throw new Error(data.message || '获取单词失败');
			}
		})
		.catch(error => {
			console.error('加载单词失败:', error);
			hideLoading();
			showToast('加载单词失败: ' + error.message, 'error');
			
			// 显示空单词列表
			displayWords([]);
			return [];
		});
	}

	/**
	 * 处理并显示单词数据
	 * @param {Array} words - 单词数据数组
	 * @param {number} total - 总记录数(如果提供)
	 * @param {number} currentPageNum - 当前页码
	 * @param {number} pageSizeNum - 每页大小
	 */
	function displayWords(words, total = null, currentPageNum = null, pageSizeNum = null) {
		console.log('【后端分页】显示单词数据:', 
					'数据条数:', words.length, 
					'总记录数:', total, 
					'当前页码:', currentPageNum, 
					'每页大小:', pageSizeNum);
		
		// 获取当前选中的章节ID（如果有）
		const chapterSelect = document.getElementById('chapter-filter');
		const selectedChapterId = chapterSelect && chapterSelect.value ? chapterSelect.value : null;
		let selectedChapterName = '';
		
		// 获取选中章节的名称（如果有）
		if (selectedChapterId) {
			for (const option of chapterSelect.options) {
				if (option.value === selectedChapterId) {
					selectedChapterName = option.textContent;
					break;
				}
			}
		}
		
		// 更新总记录数 - 优先使用传入的total参数，否则使用数组长度
		totalWords = total !== null ? total : words.length;
		
		// 使用传入的页码和每页大小，否则使用全局变量
		const displayCurrentPage = currentPageNum !== null ? currentPageNum : currentPage;
		const displayPageSize = pageSizeNum !== null ? pageSizeNum : pageSize;
		
		// 清空表格
		const tbody = document.getElementById('vocabulary-tbody');
		if (!tbody) {
			console.warn('未找到vocabulary-tbody元素');
			return;
		}
		
		tbody.innerHTML = '';
		
		// 填充表格
		if (words.length === 0) {
			tbody.innerHTML = '<tr><td colspan="6" class="center-align">暂无单词数据</td></tr>';
		} else {
			words.forEach(word => {
				const tr = document.createElement('tr');
				
				// ID
				const tdId = document.createElement('td');
				tdId.textContent = word.id || '无ID';
				tr.appendChild(tdId);
				
				// 单词
				const tdWord = document.createElement('td');
				tdWord.textContent = word.word || '无单词';
				tr.appendChild(tdWord);
				
				// 音标 - 处理可能缺失的phonetic字段
				const tdPhonetic = document.createElement('td');
				tdPhonetic.textContent = word.phonetic || '-';
				tr.appendChild(tdPhonetic);
				
				// 含义 - 确保优先使用meaning字段
				const tdDefinition = document.createElement('td');
				tdDefinition.textContent = word.meaning || '-';
				tr.appendChild(tdDefinition);
				
				// 所属章节 - 使用选中的章节名称或API返回的章节名称
				const tdChapter = document.createElement('td');
				if (selectedChapterId && selectedChapterName) {
					tdChapter.textContent = selectedChapterName;
				} else if (word.chapter_name) {
					tdChapter.textContent = word.chapter_name;
				} else if (word.chapter_id) {
					tdChapter.textContent = getChapterNameById(word.chapter_id);
				} else {
					tdChapter.textContent = '未分配章节';
				}
				tr.appendChild(tdChapter);
				
				// 操作
				const tdActions = document.createElement('td');
				tdActions.className = 'word-actions';
				
				// 编辑按钮
				const editBtn = document.createElement('button');
				editBtn.className = 'btn-small edit';
				editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
				editBtn.addEventListener('click', () => editWord(word));
				tdActions.appendChild(editBtn);
				
				// 删除按钮
				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'btn-small delete';
				deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
				deleteBtn.addEventListener('click', () => showDeleteConfirmation('word', word.id, `确定要删除单词 "${word.word}" 吗？`));
				tdActions.appendChild(deleteBtn);
				
				tr.appendChild(tdActions);
				tbody.appendChild(tr);
			});
		}
		
		// 更新分页 - 使用totalWords和displayPageSize计算总页数
		const totalPages = Math.ceil(totalWords / displayPageSize);
		console.log(`更新分页: 当前页=${displayCurrentPage}, 总页数=${totalPages}, 总记录数=${totalWords}, 每页大小=${displayPageSize}`);
		
		// 只有当总页数大于1时才显示分页控件
		if (totalPages > 1) {
			updatePagination(displayCurrentPage, totalPages);
		} else {
			// 如果只有一页，清空分页控件
			const pagination = document.getElementById('vocabulary-pagination');
			if (pagination) {
				pagination.innerHTML = '';
			}
		}
	}

	/**
	 * 根据章节ID获取章节名称
	 * @param {string|number} chapterId - 章节ID
	 * @returns {string} 章节名称
	 */
	function getChapterNameById(chapterId) {
		// 首先尝试从全局缓存中获取章节信息
		if (window.chaptersCache && window.chaptersCache[chapterId]) {
			return window.chaptersCache[chapterId].name;
		}
		
		// 尝试从当前选择的章节获取名称
		const chapterSelect = document.getElementById('chapter-filter');
		if (chapterSelect) {
			for (const option of chapterSelect.options) {
				if (option.value === chapterId.toString()) {
					return option.textContent;
				}
			}
		}
		
		// 如果没有找到名称，则显示ID
		return `章节${chapterId}`;
	}

	/**
	 * 更新分页控件
	 * @param {number} currentPage - 当前页码
	 * @param {number} totalPages - 总页数
	 */
	function updatePagination(currentPage, totalPages) {
		console.log('【后端分页】更新分页控件:', '当前页:', currentPage, '总页数:', totalPages);
		
		const pagination = document.getElementById('vocabulary-pagination');
		if (!pagination) {
			console.warn('未找到分页控件元素');
			return;
		}
		
		// 清空现有分页控件
		pagination.innerHTML = '';
		
		// 如果总页数小于等于1，不显示分页控件
		if (totalPages <= 1) {
			console.log('【后端分页】只有一页或没有数据，不显示分页控件');
			return;
		}
		
		// 添加分页标题(可选)
		const paginationInfo = document.createElement('li');
		paginationInfo.className = 'disabled';
		const paginationInfoA = document.createElement('a');
		paginationInfoA.href = '#!';
		paginationInfoA.textContent = `第${currentPage}页/共${totalPages}页`;
		paginationInfo.appendChild(paginationInfoA);
		pagination.appendChild(paginationInfo);
		
		// 前一页
		const prevLi = document.createElement('li');
		prevLi.className = currentPage === 1 ? 'disabled' : 'waves-effect';
		const prevA = document.createElement('a');
		prevA.href = '#!';
		prevA.innerHTML = '<i class="material-icons">chevron_left</i>';
		if (currentPage > 1) {
			prevA.addEventListener('click', () => {
				console.log('【后端分页】点击上一页按钮，切换到页码:', currentPage - 1);
				// 根据当前情况决定调用哪个加载函数
				handlePageChange(currentPage - 1);
			});
		}
		prevLi.appendChild(prevA);
		pagination.appendChild(prevLi);
		
		// 页码
		let startPage = Math.max(1, currentPage - 2);
		let endPage = Math.min(totalPages, startPage + 4);
		if (endPage - startPage < 4) {
			startPage = Math.max(1, endPage - 4);
		}
		
		for (let i = startPage; i <= endPage; i++) {
			const pageLi = document.createElement('li');
			pageLi.className = i === parseInt(currentPage) ? 'active' : 'waves-effect';
			const pageA = document.createElement('a');
			pageA.href = '#!';
			pageA.textContent = i;
			if (i !== parseInt(currentPage)) {
				pageA.addEventListener('click', () => {
					console.log('【后端分页】点击页码按钮，切换到页码:', i);
					// 根据当前情况决定调用哪个加载函数
					handlePageChange(i);
				});
			}
			pageLi.appendChild(pageA);
			pagination.appendChild(pageLi);
		}
		
		// 后一页
		const nextLi = document.createElement('li');
		nextLi.className = currentPage === totalPages ? 'disabled' : 'waves-effect';
		const nextA = document.createElement('a');
		nextA.href = '#!';
		nextA.innerHTML = '<i class="material-icons">chevron_right</i>';
		if (currentPage < totalPages) {
			nextA.addEventListener('click', () => {
				console.log('【后端分页】点击下一页按钮，切换到页码:', currentPage + 1);
				// 根据当前情况决定调用哪个加载函数
				handlePageChange(currentPage + 1);
			});
		}
		nextLi.appendChild(nextA);
		pagination.appendChild(nextLi);
	}

	/**
	 * 处理页码变化
	 * @param {number} newPage - 新的页码
	 */
	function handlePageChange(newPage) {
		// 验证页码有效性
		newPage = parseInt(newPage) || 1;
		const totalPages = paginationState.getTotalPages();
		
		if (newPage < 1) newPage = 1;
		if (newPage > totalPages) newPage = totalPages;
		
		// 如果页码没有变化，不做操作
		if (newPage === paginationState.currentPage) return;
		
		console.log(`切换到第 ${newPage} 页`);
		
		// 显示加载指示器
		showLoading('加载第 ' + newPage + ' 页...');
		
		// 获取当前筛选条件
		const filters = {};
		const levelId = document.getElementById('level-filter').value;
		const chapterId = document.getElementById('chapter-filter').value;
		const searchInput = document.getElementById('word-search');
		
		if (levelId) filters.levelId = levelId;
		if (chapterId) filters.chapterId = chapterId;
		if (searchInput && searchInput.value.trim()) {
			filters.query = searchInput.value.trim();
		}
		
		// 加载新页面数据
		loadWords(newPage, paginationState.pageSize, filters)
			.catch(error => {
				console.error('页面切换失败:', error);
				showToast('加载失败，请重试', 'error');
			});
	}

	/**
	 * 过滤单词列表
	 */
	function filterWords() {
		// 获取筛选条件
		const levelId = document.getElementById('level-filter').value;
		const chapterId = document.getElementById('chapter-filter').value;
		const searchInput = document.getElementById('word-search');
		
		// 构建筛选对象
		const filters = {};
		if (levelId) filters.levelId = levelId;
		if (chapterId) filters.chapterId = chapterId;
		if (searchInput && searchInput.value.trim()) {
			filters.query = searchInput.value.trim();
		}
		
		console.log('应用筛选条件:', filters);
		
		// 重置分页状态到第一页
		paginationState.reset();
		
		// 加载筛选后的数据
		loadWords(1, paginationState.pageSize, filters);
	}

	/**
	 * 搜索单词
	 */
	function searchWords() {
		const searchInput = document.getElementById('word-search');
		const levelSelect = document.getElementById('level-filter');
		const chapterSelect = document.getElementById('chapter-filter');
		
		const searchValue = searchInput.value.trim();
		console.log('搜索关键词:', searchValue);
		
		// 如果搜索关键词为空且选择了特定章节，直接加载该章节的单词
		if (!searchValue && chapterSelect && chapterSelect.value) {
			console.log('搜索关键词为空，但选择了章节，直接加载章节单词');
			loadWordsByChapter(chapterSelect.value, 1, pageSize);
			return;
		}
		
		// 如果搜索关键词为空且没有选择特定章节，则重置所有筛选并加载所有单词
		if (!searchValue && (!chapterSelect || !chapterSelect.value)) {
			console.log('搜索关键词为空，重置筛选并加载所有单词');
			loadWords(1, pageSize, {
				levelId: levelSelect.value !== '' ? levelSelect.value : null
			});
			return;
		}
		
		// 构建筛选条件
		const filters = {
			query: searchValue,
			levelId: levelSelect.value !== '' ? levelSelect.value : null,
			chapterId: chapterSelect.value !== '' ? chapterSelect.value : null
		};
		
		console.log('执行搜索，筛选条件:', filters);
		
		// 显示加载动画
		showLoading('正在搜索单词...');
		
		// 构建URL
		let url = `${API_BASE_URL}/words/search?q=${encodeURIComponent(filters.query)}`;
		
		// 添加级别筛选
		if (filters.levelId) {
			url += `&levelId=${filters.levelId}`;
		}
		
		// 添加分页参数
		url += `&page=1&size=${pageSize}`;
		
		console.log('搜索API请求URL:', url);
		
		// 执行API请求
		fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/json'
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error(`搜索失败: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			hideLoading();
			
			console.log('搜索结果:', data);
			
			if (data.success) {
				// 显示搜索结果
				showToast(`找到 ${data.total || (data.words ? data.words.length : 0)} 个匹配单词`, 'success');
				displaySearchResults(data.words || []);
			} else {
				throw new Error(data.message || '搜索失败');
			}
		})
		.catch(error => {
			console.error('搜索单词失败:', error);
			hideLoading();
			showToast('搜索失败: ' + error.message, 'error');
			
			// 显示空结果
			displaySearchResults([]);
		});
	}

	/**
	 * 显示搜索结果
	 * @param {Array} words - 搜索结果单词数组
	 */
	function displaySearchResults(words) {
		// 获取表格主体元素
		const tbody = document.getElementById('vocabulary-tbody');
		
		if (!tbody) {
			console.warn('未找到vocabulary-tbody元素');
			return;
		}
		
		// 清空表格
		tbody.innerHTML = '';
		
		// 没有结果时显示提示
		if (!words || words.length === 0) {
			tbody.innerHTML = '<tr><td colspan="6" class="center-align">没有找到匹配的单词</td></tr>';
			return;
		}
		
		// 填充表格行
		words.forEach(word => {
			const tr = document.createElement('tr');
			
			// ID
			const tdId = document.createElement('td');
			tdId.textContent = word.id || '无ID';
			tr.appendChild(tdId);
			
			// 单词
			const tdWord = document.createElement('td');
			tdWord.textContent = word.word || '无单词';
			tr.appendChild(tdWord);
			
			// 音标
			const tdPhonetic = document.createElement('td');
			tdPhonetic.textContent = word.phonetic || '-';
			tr.appendChild(tdPhonetic);
			
			// 含义
			const tdDefinition = document.createElement('td');
			tdDefinition.textContent = word.meaning || '-';
			tr.appendChild(tdDefinition);
			
			// 所属章节
			const tdChapter = document.createElement('td');
			tdChapter.textContent = word.chapter_name || '未分配章节';
			tr.appendChild(tdChapter);
			
			// 操作
			const tdActions = document.createElement('td');
			tdActions.className = 'word-actions';
			
			// 编辑按钮
			const editBtn = document.createElement('button');
			editBtn.className = 'btn-small edit';
			editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
			editBtn.addEventListener('click', () => editWord(word));
			tdActions.appendChild(editBtn);
			
			// 删除按钮
			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'btn-small delete';
			deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
			deleteBtn.addEventListener('click', () => showDeleteConfirmation('word', word.id, `确定要删除单词 "${word.word}" 吗？`));
			tdActions.appendChild(deleteBtn);
			
			tr.appendChild(tdActions);
			tbody.appendChild(tr);
		});
		
		// 更新分页状态
		paginationState.update(1, pageSize, words.length);
		
		// 更新分页控件
		const totalPages = Math.ceil(words.length / pageSize);
		if (totalPages > 1) {
			updatePagination(1, totalPages);
		} else {
			// 如果只有一页，清空分页控件
			const pagination = document.getElementById('vocabulary-pagination');
			if (pagination) {
				pagination.innerHTML = '';
			}
		}
	}

	/**
	 * 防抖函数
	 * @param {Function} func - 要执行的函数
	 * @param {number} wait - 等待时间
	 * @returns {Function} 防抖后的函数
	 */
	function debounce(func, wait) {
		let timeout;
		return function() {
			const context = this;
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func.apply(context, args);
			}, wait);
		};
	}

	/**
	 * 显示加载动画
	 * @param {string} text - 加载文本
	 */
	function showLoading(text = '正在加载...') {
		const loading = document.getElementById('loading');
		const loadingText = document.getElementById('loading-text');
		
		loadingText.textContent = text;
		loading.style.display = 'flex';
	}

	/**
	 * 隐藏加载动画
	 */
	function hideLoading() {
		document.getElementById('loading').style.display = 'none';
	}

	/**
	 * 显示提示消息
	 * @param {string} message - 消息内容
	 * @param {string} type - 消息类型，可选值：info、success、error
	 * @param {number} duration - 显示时间（毫秒）
	 */
	function showToast(message, type = 'info', duration = 3000) {
		let classes = 'rounded';
		
		switch (type) {
			case 'success':
				classes += ' green';
				break;
			case 'error':
				classes += ' red';
				break;
			default:
				classes += ' blue';
		}
		
		M.toast({
			html: message,
			classes: classes,
			displayLength: duration
		});
	}

	/**
	 * 处理退出登录
	 */
	function handleLogout() {
		localStorage.removeItem('authToken');
		showToast('已退出登录', 'info');
		setTimeout(() => {
			window.location.href = 'admin.html';
		}, 1000);
	}

	/**
	 * 处理Excel文件上传
	 * @param {Event} e - 事件对象
	 */
	async function handleExcelUpload(e) {
		const file = e.target.files[0];
		if (!file) return;

		try {
			showLoading('正在读取Excel文件...');
			
			const data = await readExcelFile(file);
			if (!data || !data.length) {
				throw new Error('Excel文件为空或格式错误');
			}

			// 存储数据用于后续导入
			window.excelImportData = data;

			// 显示预览
			showExcelPreview(data);
			
			// 启用预览按钮
			document.getElementById('preview-btn').disabled = false;
			
		} catch (error) {
			console.error('Excel处理失败:', error);
			showToast('Excel处理失败: ' + error.message, 'error');
		} finally {
			hideLoading();
		}
	}

	/**
	 * 读取Excel文件
	 * @param {File} file - Excel文件
	 * @returns {Promise<Array>} 解析后的数据
	 */
	function readExcelFile(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			
			reader.onload = function(e) {
				try {
					const data = new Uint8Array(e.target.result);
					const workbook = XLSX.read(data, { type: 'array' });
					
					// 获取第一个工作表
					const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
					
					// 转换为JSON
					const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
						header: ['word', 'meaning', 'phonetic', 'phrase', 'example', 'morphology', 'note'],
						range: 1  // 跳过标题行
					});

					resolve(jsonData);
				} catch (error) {
					reject(new Error('Excel文件解析失败: ' + error.message));
				}
			};
			
			reader.onerror = () => reject(new Error('文件读取失败'));
			reader.readAsArrayBuffer(file);
		});
	}

	/**
	 * 显示Excel预览
	 * @param {Array} data - Excel数据
	 */
	function showExcelPreview(data) {
		const previewContainer = document.getElementById('json-preview');
		if (!previewContainer) return;

		const levelId = document.getElementById('vocabulary-level').value;
		
		let validCount = 0;
		let invalidCount = 0;
		const previewData = [];

		data.forEach((row, index) => {
			const validation = validateWord(row, index, levelId);
			if (validation.isValid) {
				validCount++;
				previewData.push({
					index: index + 1,
					word: validation.data.word,
					meaning: validation.data.meaning,
					phonetic: validation.data.phonetic || '',
					status: 'valid'
				});
			} else {
				invalidCount++;
				previewData.push({
					index: index + 1,
					word: row.word || '未知',
					meaning: row.meaning || '未知',
					phonetic: row.phonetic || '',
					status: 'invalid',
					error: validation.error
				});
			}
		});

		// 显示统计信息
		const statsHtml = `
			<div class="preview-stats">
				<div class="row">
					<div class="col s12 m4">总计: <strong>${data.length}</strong></div>
					<div class="col s12 m4">有效: <strong class="green-text">${validCount}</strong></div>
					<div class="col s12 m4">无效: <strong class="red-text">${invalidCount}</strong></div>
				</div>
			</div>
		`;

		// 显示预览表格
		const tableHtml = `
			<table class="striped highlight">
				<thead>
					<tr>
						<th>序号</th>
						<th>单词</th>
						<th>含义</th>
						<th>音标</th>
						<th>状态</th>
					</tr>
				</thead>
				<tbody>
					${previewData.map(item => `
						<tr class="${item.status === 'valid' ? '' : 'red lighten-4'}">
							<td>${item.index}</td>
							<td>${item.word}</td>
							<td>${item.meaning}</td>
							<td>${item.phonetic}</td>
							<td>
								${item.status === 'valid' 
									? '<span class="green-text">有效</span>' 
									: `<span class="red-text tooltipped" data-position="left" data-tooltip="${item.error}">
										无效
										<i class="material-icons tiny">error</i>
									   </span>`
								}
							</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;

		previewContainer.innerHTML = statsHtml + tableHtml;

		// 初始化工具提示
		M.Tooltip.init(document.querySelectorAll('.tooltipped'));

		// 根据验证结果启用/禁用导入按钮
		document.getElementById('import-btn').disabled = validCount === 0;
	}

	/**
	 * 执行Excel数据导入
	 */
	async function importExcelData() {
		if (!window.excelImportData || !Array.isArray(window.excelImportData)) {
			showToast('没有可导入的数据', 'error');
			return;
		}

		const levelId = document.getElementById('vocabulary-level').value;
		if (!levelId) {
			showToast('请选择词汇等级', 'error');
			return;
		}

		// 如果选择了自定义等级，先创建新等级
		if (levelId === 'custom') {
			const levelName = document.getElementById('custom-level-name').value.trim();
			const levelDesc = document.getElementById('custom-level-description').value.trim();
			
			if (!levelName) {
				showToast('请输入自定义等级名称', 'error');
				return;
			}

			try {
				showLoading('创建新等级...');
				const newLevel = await createLevel(levelName, levelDesc);
				if (!newLevel || !newLevel.id) {
					throw new Error('创建等级失败');
				}
				levelId = newLevel.id;
			} catch (error) {
				showToast('创建等级失败: ' + error.message, 'error');
				hideLoading();
				return;
			}
		}

		try {
			showLoading('正在导入数据...');
			
			// 验证并处理数据
			const processedData = [];
			let validCount = 0;
			
			for (let i = 0; i < window.excelImportData.length; i++) {
				const validation = validateWord(window.excelImportData[i], i, levelId);
				if (validation.isValid) {
					processedData.push(validation.data);
					validCount++;
				}
			}

			if (validCount === 0) {
				throw new Error('没有有效的数据可以导入');
			}

			// 发送到服务器
			const response = await fetch(`${API_BASE_URL}/words/batch`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					words: processedData,
					level_id: levelId
				})
			});

			if (!response.ok) {
				throw new Error('导入失败: ' + await response.text());
			}

			const result = await response.json();
			
			// 清除导入数据
			window.excelImportData = null;
			document.getElementById('json-preview').innerHTML = '';
			document.getElementById('excel-file').value = '';
			document.getElementById('custom-level-input').style.display = 'none';
			document.getElementById('custom-level-desc').style.display = 'none';
			document.getElementById('vocabulary-level').value = '';
			M.FormSelect.init(document.getElementById('vocabulary-level'));

			showToast(`成功导入 ${validCount} 个单词`, 'success');
			
			// 刷新词汇列表
			await loadWords();
			
		} catch (error) {
			console.error('导入失败:', error);
			showToast(error.message, 'error');
		} finally {
			hideLoading();
		}
	}

	/**
	 * 删除章节
	 * @param {number} chapterId - 要删除的章节ID
	 */
	function deleteChapter(chapterId) {
		showLoading('删除章节...');
		
		fetch(API_BASE_URL + API_ENDPOINTS.CHAPTERS + '/' + chapterId, {
			method: 'DELETE',
			headers: {
				'Authorization': 'Bearer ' + token
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error('删除章节失败');
			}
			return response.json();
		})
		.then(data => {
			hideLoading();
			showToast('章节已删除', 'success');
			
			// 重新加载章节
			loadChapters();
		})
		.catch(error => {
			console.error('删除章节失败:', error);
			hideLoading();
			showToast(`删除失败: ${error.message}`, 'error');
		});
	}

	/**
	 * 加载级别表格
	 */
	function loadLevels() {
		// 显示加载动画
		showLoading('加载级别...');
		
		// 获取最新的级别数据
		return loadVocabularyLevels()
			.then(levels => {
				// 清空表格
				const tbody = document.getElementById('levels-tbody');
				tbody.innerHTML = '';
				
				// 填充表格
				levels.forEach(level => {
					const tr = document.createElement('tr');
					
					// ID
					const tdId = document.createElement('td');
					tdId.textContent = level.id;
					tr.appendChild(tdId);
					
					// 级别名称
					const tdName = document.createElement('td');
					tdName.textContent = level.name;
					tr.appendChild(tdName);
					
					// 描述
					const tdDescription = document.createElement('td');
					tdDescription.textContent = level.description || '-';
					tr.appendChild(tdDescription);
					
					// 排序顺序
					const tdOrder = document.createElement('td');
					tdOrder.textContent = level.order_num;
					tr.appendChild(tdOrder);
					
					// 创建时间
					const tdCreateTime = document.createElement('td');
					tdCreateTime.textContent = new Date(level.created_at).toLocaleString();
					tr.appendChild(tdCreateTime);
					
					// 操作
					const tdActions = document.createElement('td');
					tdActions.className = 'word-actions';
					
					// 编辑按钮
					const editBtn = document.createElement('button');
					editBtn.className = 'btn-small edit';
					editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
					editBtn.addEventListener('click', () => editLevel(level));
					tdActions.appendChild(editBtn);
					
					// 删除按钮
					const deleteBtn = document.createElement('button');
					deleteBtn.className = 'btn-small delete';
					deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
					deleteBtn.addEventListener('click', () => showDeleteConfirmation('level', level.id, `确定要删除级别 "${level.name}" 吗？`));
					tdActions.appendChild(deleteBtn);
					
					tr.appendChild(tdActions);
					tbody.appendChild(tr);
				});
				
				hideLoading();
				return levels;
			})
			.catch(error => {
				console.error('加载级别失败:', error);
				hideLoading();
				showToast('加载级别失败: ' + error.message, 'error');
			});
	}

	// 修复模态框ID不一致问题
	function handleImportSuccess() {
		// 清除Excel数据
		excelData = null;
		document.getElementById('excel-preview').innerHTML = '';
		document.getElementById('excel-upload').value = '';
		
		// 确保使用正确的模态框ID
		const modal = M.Modal.getInstance(document.getElementById('import-modal'));
		if (modal) {
			modal.close();
		} else {
			console.warn('未找到导入模态框，请检查HTML中的ID是否为import-modal');
		}
		
		// 刷新列表
		loadWords();
		// 不再需要加载章节管理相关数据
	}

	/**
	 * 保存单词信息
	 */
	function saveWord() {
		// 获取表单数据
		const wordId = document.getElementById('word-id').value;
		const word = document.getElementById('word-word').value;
		const meaning = document.getElementById('word-definition').value;
		const phonetic = document.getElementById('word-phonetic').value;
		const example = document.getElementById('word-example').value;
		let levelId = document.getElementById('word-level').value;
		let chapterId = document.getElementById('word-chapter').value;
		
		// 验证必填字段
		if (!word || !meaning) {
			showToast('单词和含义不能为空', 'error');
			return;
		}
		
		// 处理自定义级别
		if (levelId === 'custom') {
			const customLevelInput = document.getElementById('custom-level-name');
			if (!customLevelInput || !customLevelInput.value.trim()) {
				showToast('请输入自定义级别名称', 'error');
				return;
			}
			levelId = customLevelInput.value.trim();
		}
		
		// 处理自定义章节
		if (chapterId === 'custom') {
			const customChapterInput = document.getElementById('custom-chapter-name');
			if (!customChapterInput || !customChapterInput.value.trim()) {
				showToast('请输入自定义章节名称', 'error');
				return;
			}
			
			// 获取章节名称输入
			let chapterInput = customChapterInput.value.trim();
			
			// 处理数字输入，转换为"第X章"格式
			if (/^\d+$/.test(chapterInput)) {
				chapterInput = `第${chapterInput}章`;
			} else if (/^\d+:(.+)$/.test(chapterInput)) {
				const match = chapterInput.match(/^\d+:(.+)$/);
				if (match && match[1]) {
					const num = chapterInput.split(':')[0];
					const content = match[1].trim();
					chapterInput = `第${num}章${content}`;  // 无缝衔接
				}
			}
			
			// 为章节名称添加级别前缀
			if (levelId) {
				const levelName = getLevelNameById(levelId);
				if (levelName && !chapterInput.startsWith(levelName)) {
					chapterInput = `${levelName}${chapterInput}`;
				}
			}
			
			chapterId = chapterInput;
		}
		
		// 如果没有选择章节，但选择了级别，创建默认章节
		if (!chapterId && levelId) {
			const levelName = getLevelNameById(levelId) || levelId;
			chapterId = `${levelName}未分类`;
		}
		
		// 显示加载动画
		showLoading('保存单词...');
		
		// 准备请求数据
		const wordData = {
			word: word,
			meaning: meaning,
			phonetic: phonetic || '',
			example: example || '',
			level_id: levelId,
			chapter_id: chapterId
		};
		
		// 判断是新增还是更新
		const isUpdate = wordId ? true : false;
		
		// API URL
		let url = isUpdate ? 
			`${API_BASE_URL}/words/${wordId}` : 
			`${API_BASE_URL}/words`;
		
		// 发送请求
		fetch(url, {
			method: isUpdate ? 'PUT' : 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			body: JSON.stringify(wordData)
		})
		.then(response => {
			if (!response.ok) {
				return response.json().then(err => { throw err; });
			}
			return response.json();
		})
		.then(data => {
			if (data.success) {
				showToast(isUpdate ? '单词更新成功' : '单词添加成功', 'success');
				
				// 关闭模态框
				const modal = M.Modal.getInstance(document.getElementById('word-modal'));
				modal.close();
				
				// 重新加载单词列表
				const filters = getActiveFilters();
				loadWords(1, paginationState.pageSize, filters);
				
				// 如果创建了新级别或章节，刷新下拉框
				if (data.level_id || data.chapter_id) {
					loadVocabularyLevels().then(() => {
						if (filters.levelId) {
							loadChaptersByLevel(filters.levelId);
						}
					});
				}
			} else {
				throw new Error(data.message || '保存失败');
			}
		})
		.catch(error => {
			console.error('保存单词失败:', error);
			showToast('保存失败: ' + (error.message || '未知错误'), 'error');
		})
		.finally(() => {
			hideLoading();
		});
	}

	/**
	 * 创建新级别
	 * @param {string} name - 级别名称
	 * @param {string} description - 级别描述
	 * @param {number} orderNum - 排序号
	 * @returns {Promise<string>} 返回新创建的级别ID
	 */
	function createLevel(name, description, orderNum = 100) {
		console.log(`创建新级别: ${name}`);
		
		// 准备请求数据
		const levelData = {
			name: name,
			description: description || `${name} 词汇`,
			order_num: orderNum
		};
		
		// API请求
		return fetch(`${API_BASE_URL}/vocabulary-levels`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			body: JSON.stringify(levelData)
		})
		.then(response => {
			if (!response.ok) {
				throw new Error(`创建级别失败: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			if (data.success) {
				showToast(`创建新级别 "${name}" 成功`, 'success');
				return name; // 返回级别ID，通常是级别名称
			} else {
				throw new Error(data.message || '创建级别失败');
			}
		});
	}

	// 添加数据验证功能
	function validateExcelData(data) {
		if (!Array.isArray(data) || data.length === 0) {
			return {
				valid: false,
				message: '没有可导入的数据'
			};
		}
		
		const invalidEntries = [];
		
		data.forEach((item, index) => {
			if (!item.word || !item.definition) {
				invalidEntries.push(`第${index + 1}行：单词或释义为空`);
			}
		});
		
		return {
			valid: invalidEntries.length === 0,
			message: invalidEntries.length > 0 ? 
				`数据验证失败：${invalidEntries.slice(0, 3).join('; ')}` + 
				(invalidEntries.length > 3 ? `...等${invalidEntries.length}个问题` : '') : 
				'数据验证通过',
			invalidEntries
		};
	}

	// 增强错误处理
	function showValidationErrors(errors) {
		if (!errors || errors.length === 0) return;
		
		let errorHTML = '<div class="validation-errors">';
		errorHTML += '<h5>导入数据存在以下问题：</h5>';
		errorHTML += '<ul class="browser-default">';
		
		// 最多显示10条错误
		const displayErrors = errors.slice(0, 10);
		
		displayErrors.forEach(error => {
			errorHTML += `<li>${error}</li>`;
		});
		
		if (errors.length > 10) {
			errorHTML += `<li>...等共${errors.length}个问题</li>`;
		}
		
		errorHTML += '</ul>';
		errorHTML += '</div>';
		
		// 显示在Excel预览区域下方
		const previewDiv = document.getElementById('excel-preview');
		previewDiv.innerHTML += errorHTML;
	}

	/**
	 * 更新级别下拉框，并确保包含自定义选项
	 */
	function updateLevelDropdownWithCustomOption() {
		const levelSelect = document.getElementById('word-level');
		if (!levelSelect) return;
		
		// 添加change事件监听器（如果尚未添加）
		if (!levelSelect.dataset.hasCustomListener) {
			levelSelect.addEventListener('change', function(e) {
				// 如果选择"创建新级别"，显示自定义级别输入框
				if (e.target.value === 'custom') {
					document.getElementById('custom-level-container').style.display = 'block';
				} else {
					document.getElementById('custom-level-container').style.display = 'none';
					// 更新章节下拉框
					updateWordChapterDropdown(e);
				}
			});
			levelSelect.dataset.hasCustomListener = 'true';
		}
		
		// 清空现有选项，保留第一个默认选项
		while (levelSelect.options.length > 1) {
			levelSelect.remove(1);
		}
		
		// 添加创建新级别选项
		const customOption = document.createElement('option');
		customOption.value = 'custom';
		customOption.textContent = '🔸 创建新级别... 🔸';
		customOption.style.fontWeight = 'bold';
		customOption.style.color = '#2196F3';
		levelSelect.appendChild(customOption);
		
		// 添加现有级别
		for (const level of vocabularyLevels) {
			const option = document.createElement('option');
			option.value = level.id;
			option.textContent = level.name;
			levelSelect.appendChild(option);
		}
		
		// 重新初始化选择器
		M.FormSelect.init(levelSelect);
	}

	/**
	 * 显示添加单词模态框
	 */
	function showAddWordModal() {
		// 重置表单
		document.getElementById('word-form').reset();
		document.getElementById('word-id').value = '';
		
		// 清空所有字段
		document.getElementById('word-word').value = '';
		document.getElementById('word-phonetic').value = '';
		document.getElementById('word-definition').value = '';
		document.getElementById('word-phrase').value = '';
		document.getElementById('word-example').value = '';
		document.getElementById('word-morphology').value = '';
		document.getElementById('word-note').value = '';
		
		// 隐藏自定义级别和章节输入框
		document.getElementById('custom-level-container').style.display = 'none';
		document.getElementById('custom-chapter-container').style.display = 'none';
		
		// 清空自定义字段
		document.getElementById('custom-level-name').value = '';
		document.getElementById('custom-level-description').value = '';
		document.getElementById('custom-chapter-name').value = '';
		document.getElementById('custom-chapter-description').value = '';
		
		// 先打开模态框，这样DOM元素都处于可见状态
		const modal = M.Modal.getInstance(document.getElementById('word-modal'));
		if (modal) {
			modal.open();
		} else {
			console.error('无法获取模态框实例');
			return;
		}
		
		// 加载级别并更新下拉框
		loadVocabularyLevels().then(() => {
			// 更新级别下拉框，包括自定义选项
			updateLevelDropdownWithCustomOption();
			
			// 章节选择器暂时只保留默认选项和自定义选项
			const chapterSelect = document.getElementById('word-chapter');
			while (chapterSelect.options.length > 1) {
				chapterSelect.remove(1);
			}
			
			// 添加创建新章节选项
			const customOption = document.createElement('option');
			customOption.value = 'custom';
			customOption.textContent = '🔸 创建新章节... 🔸';
			customOption.style.fontWeight = 'bold';
			customOption.style.color = '#2196F3';
			chapterSelect.appendChild(customOption);
			
			// 重新初始化选择器
			M.FormSelect.init(chapterSelect);
			
			// 强制刷新模态框中的选择器
			setTimeout(() => {
				M.FormSelect.init(document.getElementById('word-level'));
				M.FormSelect.init(document.getElementById('word-chapter'));
				M.updateTextFields();
			}, 100);
		});
		
		// 更新模态框标题
		document.querySelector('#word-modal .modal-title').textContent = '添加新单词';
	}

	/**
	 * 显示编辑单词模态框
	 * @param {Object} word - 要编辑的单词对象
	 */
	function editWord(word) {
		// 填充表单
		document.getElementById('word-id').value = word.id;
		document.getElementById('word-word').value = word.word;
		document.getElementById('word-phonetic').value = word.phonetic || '';
		document.getElementById('word-definition').value = word.meaning || '';
		document.getElementById('word-phrase').value = word.phrase || '';
		document.getElementById('word-example').value = word.example || '';
		document.getElementById('word-morphology').value = word.morphology || '';
		document.getElementById('word-note').value = word.note || '';
		
		// 选择级别和章节
		if (word.level_id) {
			document.getElementById('word-level').value = word.level_id;
			M.FormSelect.init(document.getElementById('word-level'));
			
			// 加载该级别的章节
			const event = { target: { value: word.level_id } };
			updateWordChapterDropdown(event);
			
			// 延迟设置章节选择
			setTimeout(() => {
				if (word.chapter_id) {
					document.getElementById('word-chapter').value = word.chapter_id;
					M.FormSelect.init(document.getElementById('word-chapter'));
				}
			}, 500);
		}
		
		// 更新标签
		M.updateTextFields();
		
		// 更新模态框标题
		document.querySelector('#word-modal .modal-title').textContent = '编辑单词';
		
		// 打开模态框
		const modal = M.Modal.getInstance(document.getElementById('word-modal'));
		modal.open();
	}

	/**
	 * 显示添加级别模态框
	 */
	function showAddLevelModal() {
		// 重置表单
		document.getElementById('level-form').reset();
		document.getElementById('level-id').value = '';
		
		// 更新模态框标题
		document.querySelector('#level-modal .modal-title').textContent = '添加新级别';
		
		// 重置字段状态
		M.updateTextFields();
		
		// 打开模态框
		const modal = M.Modal.getInstance(document.getElementById('level-modal'));
		modal.open();
	}

	/**
	 * 显示编辑级别模态框
	 * @param {Object} level - 要编辑的级别对象
	 */
	function editLevel(level) {
		// 填充表单
		document.getElementById('level-id').value = level.id;
		document.getElementById('level-name').value = level.name;
		document.getElementById('level-description').value = level.description || '';
		document.getElementById('level-order').value = level.order_num;
		
		// 更新标签
		M.updateTextFields();
		
		// 更新模态框标题
		document.querySelector('#level-modal .modal-title').textContent = '编辑级别';
		
		// 打开模态框
		const modal = M.Modal.getInstance(document.getElementById('level-modal'));
		modal.open();
	}

	/**
	 * 显示添加章节模态框
	 */
	function showAddChapterModal() {
		// 重置表单
		document.getElementById('chapter-form').reset();
		document.getElementById('chapter-id').value = '';
		
		// 更新模态框标题
		document.querySelector('#chapter-modal .modal-title').textContent = '添加新章节';
		
		// 重置字段状态
		M.updateTextFields();
		
		// 打开模态框
		const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
		modal.open();
	}

	/**
	 * 显示编辑章节模态框
	 * @param {Object} chapter - 要编辑的章节对象
	 */
	function editChapter(chapter) {
		// 填充表单
		document.getElementById('chapter-id').value = chapter.id;
		document.getElementById('chapter-name').value = chapter.name;
		document.getElementById('chapter-description').value = chapter.description || '';
		document.getElementById('chapter-order').value = chapter.order_num;
		
		// 选择级别
		if (chapter.level_id) {
			document.getElementById('chapter-level-select').value = chapter.level_id;
			M.FormSelect.init(document.getElementById('chapter-level-select'));
		}
		
		// 更新标签
		M.updateTextFields();
		
		// 更新模态框标题
		document.querySelector('#chapter-modal .modal-title').textContent = '编辑章节';
		
		// 打开模态框
		const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
		modal.open();
	}

	/**
	 * 保存级别信息
	 */
	function saveLevel() {
		// 获取表单数据
		const levelId = document.getElementById('level-id').value;
		const name = document.getElementById('level-name').value;
		const description = document.getElementById('level-description').value;
		const orderNum = parseInt(document.getElementById('level-order').value) || 1;
		
		// 验证必填字段
		if (!name) {
			showToast('级别名称不能为空', 'error');
			return;
		}
		
		// 显示加载动画
		showLoading('保存级别...');
		
		// 准备请求数据
		const levelData = {
			name: name,
			description: description,
			order_num: orderNum
		};
		
		// 判断是新增还是更新
		const isUpdate = levelId ? true : false;
		
		// API URL
		let url = API_BASE_URL + API_ENDPOINTS.VOCABULARY_LEVELS;
		if (isUpdate) {
			url += '/' + levelId;
		}
		
		// 发送请求
		fetch(url, {
			method: isUpdate ? 'PUT' : 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			body: JSON.stringify(levelData)
		})
		.then(response => {
			if (!response.ok) {
				return response.json().then(errorData => {
					throw new Error(errorData.message || '保存级别失败');
				});
			}
			return response.json();
		})
		.then(data => {
			if (data.success) {
				showToast(isUpdate ? '级别更新成功' : '级别创建成功', 'success');
				
				// 关闭模态框
				const modal = M.Modal.getInstance(document.getElementById('level-modal'));
				modal.close();
				
				// 重新加载级别列表和下拉框
				loadVocabularyLevels().then(() => {
					updateLevelDropdowns();
					loadLevels();
				});
			} else {
				throw new Error(data.message || '保存级别失败');
			}
		})
		.catch(error => {
			console.error('保存级别失败:', error);
			showToast('保存失败: ' + error.message, 'error');
		})
		.finally(() => {
			hideLoading();
		});
	}

	/**
	 * 保存章节信息
	 */
	function saveChapter() {
		// 获取表单数据
		const chapterId = document.getElementById('chapter-id').value;
		let name = document.getElementById('chapter-name').value;
		const description = document.getElementById('chapter-description').value;
		const levelId = document.getElementById('chapter-level-select').value;
		const orderNum = parseInt(document.getElementById('chapter-order').value) || 1;
		
		// 获取级别名称
		const levelName = getLevelNameById(levelId);
		
		// 检查是否输入的是纯数字或包含冒号的格式（如1:xxx），如果是则转换
		if (/^\d+$/.test(name)) {
			name = `${levelName}第${name}章`;
		} else if (/^\d+:(.+)$/.test(name)) {
			const match = name.match(/^\d+:(.+)$/);
			if (match && match[1]) {
				const num = name.split(':')[0];
				const content = match[1].trim();
				name = `${levelName}第${num}章${content}`;  // 无冒号，无空格，无缝连接
			}
		} else {
			// 其他情况，直接添加级别名称前缀
			name = `${levelName}${name}`;
		}
		
		// 验证必填字段
		if (!name) {
			showToast('章节名称不能为空', 'error');
			return;
		}
		
		if (!levelId) {
			showToast('请选择所属级别', 'error');
			return;
		}
		
		// 显示加载动画
		showLoading('保存章节...');
		
		// 准备请求数据
		const chapterData = {
			name: name,
			description: description,
			level_id: parseInt(levelId),
			order_num: orderNum
		};
		
		// 判断是新增还是更新
		const isUpdate = chapterId ? true : false;
		
		// API URL
		let url = API_BASE_URL + API_ENDPOINTS.CHAPTERS;
		if (isUpdate) {
			url += '/' + chapterId;
		}
		
		// 发送请求
		fetch(url, {
			method: isUpdate ? 'PUT' : 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			body: JSON.stringify(chapterData)
		})
		.then(response => {
			if (!response.ok) {
				return response.json().then(errorData => {
					throw new Error(errorData.message || '保存章节失败');
				});
			}
			return response.json();
		})
		.then(data => {
			if (data.success) {
				showToast(isUpdate ? '章节更新成功' : '章节创建成功', 'success');
				
				// 关闭模态框
				const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
				modal.close();
				
				// 重新加载章节列表
				loadChapters();
			} else {
				throw new Error(data.message || '保存章节失败');
			}
		})
		.catch(error => {
			console.error('保存章节失败:', error);
			showToast('保存失败: ' + error.message, 'error');
		})
		.finally(() => {
			hideLoading();
		});
	}

	/**
	 * 根据级别ID获取级别名称
	 * @param {number|string} levelId - 级别ID
	 * @returns {string} 级别名称，如果未找到则返回空字符串
	 */
	function getLevelNameById(levelId) {
		if (!levelId || !vocabularyLevels) return '';
		
		const level = vocabularyLevels.find(l => l.id == levelId);
		return level ? level.name : '';
	}

	/**
	 * 加载章节列表
	 * @param {Object} filters - 过滤条件
	 * @returns {Promise} Promise对象
	 */
	function loadChapters(filters = {}) {
		// 显示加载动画
		showLoading('加载章节...');
		
		// 构建URL
		let url = API_BASE_URL + API_ENDPOINTS.CHAPTERS;
		
		// 添加过滤条件
		if (filters.levelId) {
			url += `?levelId=${filters.levelId}`;
		}
		
		return fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error('获取章节失败');
			}
			return response.json();
		})
		.then(data => {
			// 清空表格
			const tbody = document.getElementById('chapters-tbody');
			if (!tbody) {
				console.warn('未找到章节表格体元素');
				return [];
			}
			
			tbody.innerHTML = '';
			
			// 填充表格
			const chapters = data.chapters || [];
			
			if (chapters.length === 0) {
				tbody.innerHTML = '<tr><td colspan="6" class="center-align">暂无章节数据</td></tr>';
			} else {
				chapters.forEach(chapter => {
					const tr = document.createElement('tr');
					
					// ID
					const tdId = document.createElement('td');
					tdId.textContent = chapter.id;
					tr.appendChild(tdId);
					
					// 章节名称
					const tdName = document.createElement('td');
					tdName.textContent = chapter.name;
					tr.appendChild(tdName);
					
					// 描述
					const tdDescription = document.createElement('td');
					tdDescription.textContent = chapter.description || '-';
					tr.appendChild(tdDescription);
					
					// 所属级别
					const tdLevel = document.createElement('td');
					const level = vocabularyLevels.find(l => l.id === chapter.level_id);
					tdLevel.textContent = level ? level.name : '未知';
					tr.appendChild(tdLevel);
					
					// 排序顺序
					const tdOrder = document.createElement('td');
					tdOrder.textContent = chapter.order_num;
					tr.appendChild(tdOrder);
					
					// 创建时间
					const tdCreateTime = document.createElement('td');
					tdCreateTime.textContent = new Date(chapter.created_at).toLocaleString();
					tr.appendChild(tdCreateTime);
					
					// 操作
					const tdActions = document.createElement('td');
					tdActions.className = 'word-actions';
					
					// 编辑按钮
					const editBtn = document.createElement('button');
					editBtn.className = 'btn-small edit';
					editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
					editBtn.addEventListener('click', () => editChapter(chapter));
					tdActions.appendChild(editBtn);
					
					// 删除按钮
					const deleteBtn = document.createElement('button');
					deleteBtn.className = 'btn-small delete';
					deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
					deleteBtn.addEventListener('click', () => showDeleteConfirmation('chapter', chapter.id, `确定要删除章节 "${chapter.name}" 吗？`));
					tdActions.appendChild(deleteBtn);
					
					tr.appendChild(tdActions);
					tbody.appendChild(tr);
				});
			}
			
			hideLoading();
			return chapters;
		})
		.catch(error => {
			console.error('加载章节失败:', error);
			
			// 在表格中显示错误信息
			const tbody = document.getElementById('chapters-tbody');
			if (tbody) {
				tbody.innerHTML = `<tr><td colspan="6" class="center-align red-text">加载失败: ${error.message}</td></tr>`;
			}
			
			hideLoading();
			showToast('加载章节失败: ' + error.message, 'error');
		});
	}

	/**
	 * 过滤章节列表
	 */
	function filterChapters() {
		// 获取级别筛选条件
		const levelId = document.getElementById('chapter-level-filter').value;
		
		// 构建过滤条件对象
		const filters = {};
		if (levelId) filters.levelId = levelId;
		
		// 重新加载章节列表
		loadChapters(filters);
	}

	/**
	 * 显示删除确认对话框
	 * @param {string} type - 删除类型（word/level/chapter）
	 * @param {number} id - 要删除的项ID
	 * @param {string} message - 确认消息
	 */
	function showDeleteConfirmation(type, id, message) {
		// 设置确认消息
		document.getElementById('delete-message').textContent = message;
		
		// 设置确认按钮点击事件
		const confirmButton = document.getElementById('btn-confirm-delete');
		confirmButton.onclick = () => {
			// 关闭模态框
			const modal = M.Modal.getInstance(document.getElementById('delete-modal'));
			modal.close();
			
			// 根据类型执行不同的删除操作
			switch (type) {
				case 'word':
					deleteWord(id);
					break;
				case 'level':
					deleteLevel(id);
					break;
				case 'chapter':
					deleteChapter(id);
					break;
				default:
					showToast('未知删除类型', 'error');
			}
		};
		
		// 打开模态框
		const modal = M.Modal.getInstance(document.getElementById('delete-modal'));
		modal.open();
	}

	/**
	 * 删除单词
	 * @param {number} wordId - 要删除的单词ID
	 */
	function deleteWord(wordId) {
		showLoading('删除单词...');
		
		fetch(API_BASE_URL + API_ENDPOINTS.WORDS_MANAGE + '/' + wordId, {
			method: 'DELETE',
			headers: {
				'Authorization': 'Bearer ' + token
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error('删除单词失败');
			}
			return response.json();
		})
		.then(data => {
			hideLoading();
			showToast('单词已删除', 'success');
			
			// 重新加载单词列表
			loadWords(currentPage, pageSize);
		})
		.catch(error => {
			console.error('删除单词失败:', error);
			hideLoading();
			showToast(`删除失败: ${error.message}`, 'error');
		});
	}

	/**
	 * 删除级别
	 * @param {number} levelId - 要删除的级别ID
	 */
	function deleteLevel(levelId) {
		showLoading('删除级别...');
		
		fetch(API_BASE_URL + API_ENDPOINTS.VOCABULARY_LEVELS + '/' + levelId, {
			method: 'DELETE',
			headers: {
				'Authorization': 'Bearer ' + token
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error('删除级别失败');
			}
			return response.json();
		})
		.then(data => {
			hideLoading();
			showToast('级别已删除', 'success');
			
			// 重新加载级别列表和下拉框
			loadVocabularyLevels().then(() => {
				updateLevelDropdowns();
				// 不再需要加载级别管理相关数据
			});
		})
		.catch(error => {
			console.error('删除级别失败:', error);
			hideLoading();
			showToast(`删除失败: ${error.message}`, 'error');
		});
	}

	// 添加一个测试函数检测API是否可用
	function testDirectAPI() {
		// 显示正在测试的消息
		showLoading('正在测试API...');
		
		// 直接通过fetch测试单词API
		return fetch('https://www.sanjinai.cn:5000/api/chapters/1/words')
			.then(response => {
				if (!response.ok) {
					return response.text().then(text => {
						console.log('API返回:', text);
						throw new Error(`API测试失败: ${response.status}`);
					});
				}
				return response.json();
			})
			.then(data => {
				console.log('API测试成功，返回数据:', data);
				hideLoading();
				showToast('API测试成功', 'success');
				
				// 显示数据
				const words = Array.isArray(data) ? data : [];
				
				// 在表格中显示测试结果
				displayWords(words);
				
				return words;
			})
			.catch(error => {
				console.error('API测试失败:', error);
				hideLoading();
				showToast(`API测试失败: ${error.message}`, 'error');
			});
	}

	/**
	 * 针对API问题的解决方案处理和显示单词数据
	 * @param {Array} words - 单词数据数组
	 */
	function displayWords(words) {
		// 清空表格
		const tbody = document.getElementById('vocabulary-tbody');
		tbody.innerHTML = '';
		
		// 显示数据范围信息
		let rangeInfo = '';
		if (paginationState.totalItems > 0) {
			const startItem = (paginationState.currentPage - 1) * paginationState.pageSize + 1;
			const endItem = Math.min(paginationState.currentPage * paginationState.pageSize, paginationState.totalItems);
			rangeInfo = `显示 ${startItem}-${endItem}，共 ${paginationState.totalItems} 条`;
		}
		
		// 更新或创建范围信息元素
		let rangeInfoElem = document.getElementById('data-range-info');
		if (!rangeInfoElem) {
			rangeInfoElem = document.createElement('div');
			rangeInfoElem.id = 'data-range-info';
			rangeInfoElem.className = 'right-align grey-text';
			const tableContainer = document.querySelector('#vocabulary-table').parentNode;
			tableContainer.insertBefore(rangeInfoElem, document.getElementById('vocabulary-pagination'));
		}
		rangeInfoElem.textContent = rangeInfo;
		
		// 填充表格
		if (words.length === 0) {
			tbody.innerHTML = '<tr><td colspan="6" class="center-align">暂无单词数据</td></tr>';
		} else {
			words.forEach(word => {
				const tr = document.createElement('tr');
				
				// ID
				const tdId = document.createElement('td');
				tdId.textContent = word.id || '无ID';
				tr.appendChild(tdId);
				
				// 单词
				const tdWord = document.createElement('td');
				tdWord.textContent = word.word || '无单词';
				tr.appendChild(tdWord);
				
				// 音标 - 处理可能缺失的phonetic字段
				const tdPhonetic = document.createElement('td');
				tdPhonetic.textContent = word.phonetic || '-';
				tr.appendChild(tdPhonetic);
				
				// 含义 - 确保优先使用meaning字段
				const tdDefinition = document.createElement('td');
				tdDefinition.textContent = word.meaning || '-';
				tr.appendChild(tdDefinition);
				
				// 所属章节 - 使用选中的章节名称或API返回的章节名称
				const tdChapter = document.createElement('td');
				if (word.chapter_name) {
					tdChapter.textContent = word.chapter_name;
				} else if (word.chapter_id) {
					tdChapter.textContent = getChapterNameById(word.chapter_id);
				} else {
					tdChapter.textContent = '未分配章节';
				}
				tr.appendChild(tdChapter);
				
				// 操作
				const tdActions = document.createElement('td');
				tdActions.className = 'word-actions';
				
				// 编辑按钮
				const editBtn = document.createElement('button');
				editBtn.className = 'btn-small edit';
				editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
				editBtn.addEventListener('click', () => editWord(word));
				tdActions.appendChild(editBtn);
				
				// 删除按钮
				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'btn-small delete';
				deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
				deleteBtn.addEventListener('click', () => showDeleteConfirmation('word', word.id, `确定要删除单词 "${word.word}" 吗？`));
				tdActions.appendChild(deleteBtn);
				
				tr.appendChild(tdActions);
				tbody.appendChild(tr);
			});
		}
		
		// 重要: 无论如何都更新分页控件
		updatePagination();
	}

	// // 添加直接API测试函数
	// function directAPITest() {
	//     showLoading('测试API中...');
		
	//     // 尝试直接用fetch测试API
	//     fetch('https://www.sanjinai.cn:5000/api/chapters/1/words', {
	//         method: 'GET', 
	//         headers: {
	//             'Accept': 'application/json'
	//         }
	//     })
	//     .then(response => {
	//         if (!response.ok) {
	//             return response.text().then(text => {
	//                 console.log('API返回:', text);
	//                 throw new Error(`API测试失败: ${response.status}`);
	//             });
	//         }
	//         return response.json();
	//     })
	//     .then(data => {
	//         console.log('API测试成功，数据:', data);
			
	//         // 显示测试结果
	//         const resultContainer = document.getElementById('test-result');
	//         if (!resultContainer) {
	//             const container = document.createElement('div');
	//             container.id = 'test-result';
	//             container.className = 'card-panel';
	//             container.style.margin = '20px';
	//             document.querySelector('.container').appendChild(container);
	//         }
			
	//         const container = document.getElementById('test-result');
	//         container.innerHTML = `
	//             <h5>API测试结果</h5>
	//             <p>API状态: <span class="green-text">成功</span></p>
	//             <p>返回数据: ${JSON.stringify(data, null, 2)}</p>
	//             <p>解决方法: 修改服务器端app.js，将查询中的w.phonetic改为w.pronunciation</p>
	//             <pre class="code grey lighten-4 z-depth-1" style="padding: 10px;">
	// const query = \`
	//     SELECT w.id, w.word, w.definition, w.pronunciation AS phonetic, wm.order_num
	//     FROM Words w
	//     JOIN WordMappings wm ON w.id = wm.word_id
	//     WHERE wm.chapter_id = ?
	//     ORDER BY wm.order_num
	// \`;
	//             </pre>
	//         `;
			
	//         hideLoading();
	//         showToast('API测试成功', 'success');
	//     })
	//     .catch(error => {
	//         console.error('API测试失败:', error);
			
	//         // 创建或更新测试结果容器
	//         const resultContainer = document.getElementById('test-result');
	//         if (!resultContainer) {
	//             const container = document.createElement('div');
	//             container.id = 'test-result';
	//             container.className = 'card-panel';
	//             container.style.margin = '20px';
	//             document.querySelector('.container').appendChild(container);
	//         }
			
	//         const container = document.getElementById('test-result');
	//         container.innerHTML = `
	//             <h5>API测试结果</h5>
	//             <p>API状态: <span class="red-text">失败</span></p>
	//             <p>错误信息: ${error.message}</p>
	//             <p>原因: 服务器代码中查询使用了不存在的列名 'w.phonetic'，而数据库中的列名是 'w.pronunciation'</p>
	//             <p>解决方法: 修改服务器端app.js，将查询中的w.phonetic改为w.pronunciation</p>
	//             <pre class="code grey lighten-4 z-depth-1" style="padding: 10px;">
	// const query = \`
	//     SELECT w.id, w.word, w.definition, w.pronunciation AS phonetic, wm.order_num
	//     FROM Words w
	//     JOIN WordMappings wm ON w.id = wm.word_id
	//     WHERE wm.chapter_id = ?
	//     ORDER BY wm.order_num
	// \`;
	//             </pre>
	//         `;
			
	//         hideLoading();
	//         showToast(`API测试失败: ${error.message}`, 'error');
	//     });
	// }

	// 根据级别加载章节
	async function loadChaptersByLevel(levelId) {
		const chapterSelect = document.getElementById('chapter-filter');
		if (!chapterSelect) return;

		try {
			let url;
			if (levelId) {
				// 加载特定级别的章节
				url = `${API_BASE_URL}${API_ENDPOINTS.LEVEL_CHAPTERS.replace('{id}', levelId)}`;
			} else {
				// 加载所有章节
				url = `${API_BASE_URL}${API_ENDPOINTS.CHAPTERS}`;
			}

			const response = await fetch(url, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('获取章节失败');
			}

			const data = await response.json();
			const chapters = data.chapters || [];

			// 清空现有选项
			chapterSelect.innerHTML = '<option value="">所有章节</option>';

			// 添加章节选项
			chapters.forEach(chapter => {
				const option = document.createElement('option');
				option.value = chapter.id;
				option.textContent = chapter.name;
				if (levelId) {
					option.textContent = chapter.name;
				} else {
					// 如果是显示所有章节，在章节名称前添加所属级别名称
					const levelName = vocabularyLevels.find(l => l.id === chapter.level_id)?.name || '';
					option.textContent = `${levelName} - ${chapter.name}`;
				}
				chapterSelect.appendChild(option);
			});

			// 初始化Materialize select
			M.FormSelect.init(chapterSelect);

		} catch (error) {
			console.error('加载章节失败:', error);
			showToast('加载章节失败: ' + error.message, 'error');
		}
	}

	/**
	 * 处理级别选择变化
	 */
	function handleLevelChange(event) {
		const levelId = event.target.value;
		loadChaptersByLevel(levelId);
	}

	// 初始化筛选器
	async function initializeFilters() {
		try {
			// 获取筛选器元素
			const levelSelect = document.getElementById('level-filter');
			const chapterSelect = document.getElementById('chapter-filter');
			
			// 确保元素存在
			if (!levelSelect || !chapterSelect) {
				console.error('筛选器元素未找到');
				return;
			}

			// 获取token
			const token = localStorage.getItem('authToken');
			if (!token) {
				throw new Error('未登录');
			}

			// 加载词汇级别
			const response = await fetch(`${API_BASE_URL}/vocabulary-levels`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('加载级别失败');
			}

			const data = await response.json();
			if (!data.success) {
				throw new Error(data.message || '加载级别失败');
			}

			// 清空现有选项
			levelSelect.innerHTML = '<option value="">全部级别</option>';
			
			// 添加级别选项
			data.levels.forEach(level => {
				const option = document.createElement('option');
				option.value = level.id;
				option.textContent = level.name;
				levelSelect.appendChild(option);
			});

			// 如果有级别数据,选择第一个级别
			if (data.levels.length > 0) {
				levelSelect.selectedIndex = 1; // 选择第一个实际的级别（索引0是"全部级别"）
				// 加载该级别的章节
				await loadChaptersByLevel(data.levels[0].id);
			}

			// 初始化 Materialize 下拉菜单
			M.FormSelect.init(levelSelect);
			M.FormSelect.init(chapterSelect);

			// 添加事件监听器
			levelSelect.addEventListener('change', async (e) => {
				const levelId = e.target.value;
				await loadChaptersByLevel(levelId);
				filterWords();
			});

			chapterSelect.addEventListener('change', filterWords);
			
			// 为搜索输入框添加防抖
			const searchInput = document.getElementById('search-input');
			if (searchInput) {
				searchInput.addEventListener('input', debounce(filterWords, 500));
			}

		} catch (error) {
			console.error('初始化筛选器失败:', error);
			showToast(error.message, 'error');
		}
	}

	// 初始化函数
	async function initializeVocabularyManager() {
		try {
			showLoading('正在初始化...');
			
			// 初始化MaterializeCSS组件
			M.AutoInit();
			
			// 初始化导入功能
			initializeImportFeatures();
			
			// 加载词汇级别
			const levelResponse = await fetch(`${API_BASE_URL}/vocabulary-levels`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			
			if (!levelResponse.ok) {
				throw new Error('加载词汇级别失败');
			}
			
			const levelData = await levelResponse.json();
			console.log('加载到的词汇级别数据:', levelData);
			
			if (!levelData.success || !levelData.levels || levelData.levels.length === 0) {
				showToast('没有找到词汇级别数据,请联系管理员', 'error');
				return;
			}

			// 更新全局变量
			vocabularyLevels = levelData.levels || [];
			
			// 同时更新所有级别下拉框
			await updateAllLevelSelects(levelData.levels);

			// 更新级别下拉框
			const levelSelect = document.getElementById('level-filter');
			if (levelSelect) {
				levelSelect.innerHTML = '<option value="">全部级别</option>';
				levelData.levels.forEach(level => {
					const option = document.createElement('option');
					option.value = level.id;
					option.textContent = level.name;
					levelSelect.appendChild(option);
				});
				
				// 初始化 Materialize 下拉菜单
				M.FormSelect.init(levelSelect);
				
				// 选择第一个级别
				if (levelData.levels.length > 0) {
					levelSelect.selectedIndex = 1;
					M.FormSelect.init(levelSelect);
					
					// 加载该级别的章节
					const firstLevelId = levelData.levels[0].id;
					await loadChaptersByLevel(firstLevelId);
					
					// 更新事件监听器
					levelSelect.addEventListener('change', async (e) => {
						const levelId = e.target.value;
						console.log(`级别选择变更: ${levelId}`);
						
						if (levelId) {
							await loadChaptersByLevel(levelId);
						}
						filterWords();
					});
					
					// 章节筛选事件监听
					const chapterSelect = document.getElementById('chapter-filter');
					if (chapterSelect) {
						chapterSelect.addEventListener('change', filterWords);
					}
					
					// 加载单词数据
					filterWords();
				}
			}
			
			hideLoading();
		} catch (error) {
			console.error('初始化失败:', error);
			showToast(error.message, 'error');
			hideLoading();
		}
	}

	/**
	 * 更新所有级别下拉框
	 * @param {Array} levels - 级别数据
	 */
	async function updateAllLevelSelects(levels) {
		// 获取所有需要更新的下拉框
		const levelSelects = [
			document.getElementById('import-level-select'),
			document.getElementById('word-level'),
			document.getElementById('chapter-level-select'),
			document.getElementById('chapter-level-filter')
		];
		
		// 清空并重新填充每个下拉框
		levelSelects.forEach(select => {
			if (!select) return;
			
			// 清空现有选项
			select.innerHTML = '';
			
			// 添加默认选项
			const defaultOption = document.createElement('option');
			defaultOption.value = "";
			defaultOption.textContent = "选择级别";
			defaultOption.disabled = true;
			defaultOption.selected = true;
			select.appendChild(defaultOption);
			
			// 添加级别选项
			levels.forEach(level => {
				const option = document.createElement('option');
				option.value = level.id; // 使用级别ID作为值
				option.textContent = level.name;
				select.appendChild(option);
			});
			
			// 刷新MaterializeCSS组件
			M.FormSelect.init(select);
		});
	}

	/**
	 * 加载指定级别的章节
	 * @param {number} levelId - 词汇级别ID
	 */
	async function loadChapters(levelId) {
		// 直接调用已有的loadChaptersByLevel函数
		await loadChaptersByLevel(levelId);
	}

	function handleChapterChange() {
		const chapterSelect = document.getElementById('chapter-filter');
		const levelSelect = document.getElementById('level-filter');
		
		if (!chapterSelect || !levelSelect) {
			console.error('无法找到章节或级别选择器');
			return;
		}
		
		// 获取当前选中的级别和章节
		const levelId = levelSelect.value;
		const chapterId = chapterSelect.value;

		console.log(`筛选条件变更: 级别ID=${levelId}, 章节ID=${chapterId}`);
		
		// 如果有选择章节，则加载该章节的单词
		if (chapterId) {
			loadWordsByChapter(chapterId, 1, pageSize);
		} 
		// 否则如果选择了级别，使用级别筛选加载单词
		else if (levelId) {
			loadWords(1, pageSize, { levelId: levelId });
		} 
		// 如果都没有选择，则加载所有单词
		else {
			loadWords(1, pageSize, {});
		}
	}

	/**
	 * 加载特定章节的单词
	 * @param {number|string} chapterId - 章节ID
	 * @param {number} page - 当前页码，默认为1
	 * @param {number} pageSize - 每页大小，默认为20
	 */
	function loadWordsByChapter(chapterId, page = 1, pageSize = 20) {
		// 显示加载动画
		showLoading('加载章节单词...');
		
		// 确保章节ID是URL编码的
		const encodedChapterId = encodeURIComponent(chapterId);
		
		// 保存当前分页状态到全局变量
		currentPage = page;
		
		// 构建查询参数
		let queryParams = new URLSearchParams();
		queryParams.set('page', page);
		queryParams.set('size', pageSize);
		
		// 构建API URL，添加分页参数
		const url = `${API_BASE_URL}/chapters/${encodedChapterId}/words?${queryParams.toString()}`;
		
		console.log('【后端分页】请求章节单词URL:', url);
		console.log('【后端分页】请求页码:', page, '每页大小:', pageSize);
		
		// 发送API请求
		fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			}
		})
		.then(response => {
			if (!response.ok) {
				return response.text().then(text => {
					try {
						// 尝试解析为JSON
						const errorData = JSON.parse(text);
						console.error('API错误:', errorData);
						throw new Error(`获取章节单词失败：${response.status} - ${errorData.message || '未知错误'}`);
					} catch (e) {
						// 如果不是JSON，返回原始文本
						console.error('API错误:', text);
						throw new Error(`获取章节单词失败：${response.status}`);
					}
				});
			}
			return response.json();
		})
		.then(data => {
			console.log('【后端分页】获取章节单词成功:', data);
			console.log('【后端分页】API返回状态:', data.success ? '成功' : '失败', 
				'总记录数:', data.total, 
				'当前页:', data.page, 
				'每页大小:', data.size,
				'数据条数:', data.words ? data.words.length : 0);
			
			hideLoading();
			
			if (!data.success) {
				throw new Error(data.message || '获取章节单词失败');
			}
			
			// 直接使用后端返回的分页数据
			// 不再缓存到window.allWords
			displayWords(data.words, data.total, data.page, data.size);
			
			// 如果没有单词，显示提示消息
			if (data.words.length === 0) {
				showToast('该章节暂无单词，请先添加单词', 'info');
				
				// 清空表格并显示提示
				const tbody = document.getElementById('vocabulary-tbody');
				if (tbody) {
					tbody.innerHTML = `<tr><td colspan="6" class="center-align">该章节暂无单词，可以点击"添加单词"按钮添加</td></tr>`;
				}
			}
		})
		.catch(error => {
			console.error('加载章节单词失败:', error);
			hideLoading();
			
			// 在表格中显示错误信息
			const tbody = document.getElementById('vocabulary-tbody');
			if (tbody) {
				tbody.innerHTML = `<tr><td colspan="6" class="center-align red-text">加载失败: ${error.message}</td></tr>`;
			}
			
			showToast('加载章节单词失败: ' + error.message, 'error');
		});
	}

	/**
	 * 临时函数，用于捕获谁在调用已删除的displayPagedWords
	 */
	function displayPagedWords(page, pageSize) {
		console.error('【调试】已删除的displayPagedWords函数被调用!', '页码:', page, '每页大小:', pageSize);
		console.trace('【调试】调用堆栈:');
		
		// 临时解决方案：重定向到handlePageChange
		handlePageChange(page);
	}

	function updatePagination() {
		const paginationContainer = document.getElementById('vocabulary-pagination');
		
		// 确保分页容器存在
		if (!paginationContainer) {
			console.warn('分页容器未找到');
			return;
		}
		
		// 清空分页容器
		paginationContainer.innerHTML = '';
		
		// 获取当前分页信息
		const currentPage = paginationState.currentPage;
		const totalPages = paginationState.getTotalPages();
		
		// 记录分页信息便于调试
		console.log('分页信息:', {
			当前页: currentPage,
			总页数: totalPages,
			总记录数: paginationState.totalItems,
			每页大小: paginationState.pageSize
		});
		
		// 如果总记录数为0，隐藏分页控件
		if (paginationState.totalItems === 0) {
			paginationContainer.style.display = 'none';
			return;
		}
		
		// 确保分页容器可见
		paginationContainer.style.display = 'flex';
		
		// 创建"上一页"按钮
		const prevLi = document.createElement('li');
		prevLi.className = currentPage === 1 ? 'disabled' : 'waves-effect';
		
		const prevLink = document.createElement('a');
		prevLink.href = '#!';
		prevLink.innerHTML = '<i class="material-icons">chevron_left</i>';
		if (currentPage > 1) {
			prevLink.addEventListener('click', () => handlePageChange(currentPage - 1));
		}
		
		prevLi.appendChild(prevLink);
		paginationContainer.appendChild(prevLi);
		
		// 创建页码按钮（智能显示: 当页数过多时只显示部分）
		let startPage = Math.max(1, currentPage - 2);
		let endPage = Math.min(totalPages, startPage + 4);
		
		// 调整startPage确保显示5个页码（如果有这么多）
		if (endPage - startPage < 4 && totalPages > 4) {
			startPage = Math.max(1, endPage - 4);
		}
		
		// 添加第一页和省略号（如果需要）
		if (startPage > 1) {
			const firstLi = document.createElement('li');
			const firstLink = document.createElement('a');
			firstLink.href = '#!';
			firstLink.textContent = '1';
			firstLink.addEventListener('click', () => handlePageChange(1));
			firstLi.appendChild(firstLink);
			paginationContainer.appendChild(firstLi);
			
			if (startPage > 2) {
				const ellipsisLi = document.createElement('li');
				ellipsisLi.className = 'disabled';
				const ellipsisSpan = document.createElement('span');
				ellipsisSpan.textContent = '...';
				ellipsisLi.appendChild(ellipsisSpan);
				paginationContainer.appendChild(ellipsisLi);
			}
		}
		
		// 添加页码按钮
		for (let i = startPage; i <= endPage; i++) {
			const pageLi = document.createElement('li');
			pageLi.className = i === currentPage ? 'active' : 'waves-effect';
			
			const pageLink = document.createElement('a');
			pageLink.href = '#!';
			pageLink.textContent = i;
			if (i !== currentPage) {
				pageLink.addEventListener('click', () => handlePageChange(i));
			}
			
			pageLi.appendChild(pageLink);
			paginationContainer.appendChild(pageLi);
		}
		
		// 添加最后一页和省略号（如果需要）
		if (endPage < totalPages) {
			if (endPage < totalPages - 1) {
				const ellipsisLi = document.createElement('li');
				ellipsisLi.className = 'disabled';
				const ellipsisSpan = document.createElement('span');
				ellipsisSpan.textContent = '...';
				ellipsisLi.appendChild(ellipsisSpan);
				paginationContainer.appendChild(ellipsisLi);
			}
			
			const lastLi = document.createElement('li');
			const lastLink = document.createElement('a');
			lastLink.href = '#!';
			lastLink.textContent = totalPages;
			lastLink.addEventListener('click', () => handlePageChange(totalPages));
			lastLi.appendChild(lastLink);
			paginationContainer.appendChild(lastLi);
		}
		
		// 创建"下一页"按钮
		const nextLi = document.createElement('li');
		nextLi.className = currentPage === totalPages ? 'disabled' : 'waves-effect';
		
		const nextLink = document.createElement('a');
		nextLink.href = '#!';
		nextLink.innerHTML = '<i class="material-icons">chevron_right</i>';
		if (currentPage < totalPages) {
			nextLink.addEventListener('click', () => handlePageChange(currentPage + 1));
		}
		
		nextLi.appendChild(nextLink);
		paginationContainer.appendChild(nextLi);
	}

	// 使自定义级别和章节输入框更显眼
	document.addEventListener('DOMContentLoaded', function() {
		// 创建样式元素
		const style = document.createElement('style');
		style.textContent = `
			#custom-level-container, #custom-chapter-container {
				background-color: #f5f5f5;
				padding: 10px 15px;
				border-radius: 8px;
				border-left: 3px solid #2196F3;
				margin-top: 10px;
				box-shadow: 0 2px 5px rgba(0,0,0,0.1);
				transition: all 0.3s ease;
			}
			
			#custom-level-container .input-field, 
			#custom-chapter-container .input-field {
				margin-bottom: 5px;
			}
			
			.custom-option-title {
				color: #2196F3;
				font-weight: bold;
				margin: 0 0 10px 0;
				font-size: 14px;
			}
		`;
		
		// 添加到页面
		document.head.appendChild(style);
		
		// 为自定义容器添加标题
		const levelContainer = document.getElementById('custom-level-container');
		if (levelContainer) {
			const titleElem = document.createElement('p');
			titleElem.className = 'custom-option-title';
			titleElem.textContent = '创建新级别';
			levelContainer.insertBefore(titleElem, levelContainer.firstChild);
		}
		
		const chapterContainer = document.getElementById('custom-chapter-container');
		if (chapterContainer) {
			const titleElem = document.createElement('p');
			titleElem.className = 'custom-option-title';
			titleElem.textContent = '创建新章节';
			chapterContainer.insertBefore(titleElem, chapterContainer.firstChild);
			
			// 添加提示文本
			const hintElem = document.createElement('p');
			hintElem.className = 'custom-option-hint';
			hintElem.innerHTML = '提示：可直接输入数字（如：1、2、3），<br>将自动转换为"[级别名称]第1章"格式<br>或输入"1:介绍"格式，将转换为"[级别名称]第1章介绍"（无缝连接）';
			hintElem.style.fontSize = '12px';
			hintElem.style.color = '#757575';
			hintElem.style.margin = '5px 0';
			chapterContainer.insertBefore(hintElem, chapterContainer.children[1]);
		}
	});

	/**
	 * 处理JSON文件上传
	 * @param {Event} e - 事件对象
	 */
	function handleJsonUpload(e) {
		const file = e.target.files[0];
		if (!file) return;
		
		// 显示加载动画
		showLoading('正在解析JSON文件...');
		
		const reader = new FileReader();
		
		reader.onload = function(e) {
			try {
				const jsonData = JSON.parse(e.target.result);
				console.log('解析的JSON数据:', jsonData);
				
				// 验证JSON格式
				if (!Array.isArray(jsonData)) {
					throw new Error('JSON数据必须是数组格式');
				}
				
				// 验证数据结构
				const validationResult = validateJsonData(jsonData);
				if (!validationResult.valid) {
					throw new Error(validationResult.message);
				}
				
				// 保存数据供后续使用
				window.jsonImportData = jsonData;
				
				// 更新预览
				updateJsonPreview(jsonData);
				
				hideLoading();
				showToast(`成功解析 ${jsonData.length} 个单词数据`, 'success');
			} catch (error) {
				console.error('JSON解析错误:', error);
				hideLoading();
				showToast(`JSON解析失败: ${error.message}`, 'error');
			}
		};
		
		reader.onerror = function() {
			console.error('文件读取错误');
			hideLoading();
			showToast('文件读取错误', 'error');
		};
		
		reader.readAsText(file);
	}

	/**
	 * 验证JSON数据格式
	 * @param {Array} data - JSON数据
	 * @returns {Object} 验证结果
	 */
	function validateJsonData(data) {
		if (!Array.isArray(data) || data.length === 0) {
			return {
				valid: false,
				message: '没有可导入的数据'
			};
		}
		
		const invalidEntries = [];
		
		data.forEach((item, index) => {
			if (!item.word || !item.definition) {
				invalidEntries.push(`第${index + 1}行：单词或释义为空`);
			}
		});
		
		return {
			valid: invalidEntries.length === 0,
			message: invalidEntries.length > 0 ? 
				`数据验证失败：${invalidEntries.slice(0, 3).join('; ')}` + 
				(invalidEntries.length > 3 ? `...等${invalidEntries.length}个问题` : '') : 
				'数据验证通过',
			invalidEntries
		};
	}

	/**
	 * 更新JSON预览
	 * @param {Array} data - JSON数据
	 */
	function updateJsonPreview(data) {
		const previewDiv = document.getElementById('json-preview');
		if (!previewDiv) return;
		
		// 创建预览表格
		let html = `
			<table class="striped">
				<thead>
					<tr>
						<th>序号</th>
						<th>单词</th>
						<th>含义</th>
						<th>章节</th>
					</tr>
				</thead>
				<tbody>
		`;
		
		// 显示前10个单词作为预览
		data.slice(0, 10).forEach((item, index) => {
			html += `
				<tr>
					<td>${index + 1}</td>
					<td>${item.word}</td>
					<td>${item.meaning}</td>
					<td>第${item.chapter_id || '?'}章</td>
				</tr>
			`;
		});
		
		html += `
				</tbody>
			</table>
		`;
		
		if (data.length > 10) {
			html += `<p class="center-align">共 ${data.length} 个单词，显示前10个</p>`;
		}
		
		previewDiv.innerHTML = html;
	}

	/**
	 * 导入JSON数据
	 */
	async function importJsonData() {
		if (!window.jsonImportData || !Array.isArray(window.jsonImportData)) {
			showToast('没有可导入的JSON数据', 'error');
			return;
		}
		
		const levelSelect = document.getElementById('json-level-select');
		let levelId = levelSelect.value;
		
		// 如果选择了创建新级别，先创建级别
		if (levelId === 'custom') {
			const levelName = document.getElementById('json-custom-level-name').value.trim();
			const levelDesc = document.getElementById('json-custom-level-description').value.trim();
			
			if (!levelName) {
				showToast('请输入级别名称', 'error');
				return;
			}
			
			try {
				const newLevel = await createLevel(levelName, levelDesc);
				if (newLevel && newLevel.id) {
					levelId = newLevel.id;
				} else {
					throw new Error('创建级别失败');
				}
			} catch (error) {
				console.error('创建级别失败:', error);
				showToast('创建级别失败: ' + error.message, 'error');
				return;
			}
		}
		
		if (!levelId) {
			showToast('请选择或创建目标级别', 'error');
			return;
		}
		
		showLoading('正在导入数据...');
		
		try {
			// 按照之前的数据库导入规则处理数据
			const processedData = window.jsonImportData.map(item => ({
				word: item.word,
				meaning: item.meaning,
				level_id: levelId,
				chapter_id: item.chapter_id // 保持原有的chapter_id
			}));
			
			// 发送到服务器
			const response = await fetch(API_BASE_URL + API_ENDPOINTS.IMPORT_WORDS, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(processedData)
			});
			
			if (!response.ok) {
				throw new Error('导入失败: ' + (await response.text()));
			}
			
			const result = await response.json();
			
			// 清除导入数据
			window.jsonImportData = null;
			document.getElementById('json-preview').innerHTML = '<p class="center-align">上传JSON文件后在此处显示预览</p>';
			document.getElementById('json-upload').value = '';
			document.getElementById('json-custom-level-container').style.display = 'none';
			document.getElementById('json-level-select').value = '';
			M.FormSelect.init(document.getElementById('json-level-select'));
			
			hideLoading();
			showToast('数据导入成功', 'success');
			
			// 刷新词汇列表
			setTimeout(() => {
				loadWords(1, pageSize);
			}, 1000);
			
		} catch (error) {
			console.error('导入过程错误:', error);
			hideLoading();
			showToast(error.message, 'error');
		}
	}

	// 获取当前选择的级别
	function getSelectedLevel() {
		const levelSelect = document.getElementById('levelSelect');
		const customLevelInput = document.getElementById('customLevel');
		
		if (levelSelect.value === 'custom') {
			return customLevelInput.value.trim();
		}
		return levelSelect.value;
	}

	// 重置表单
	function resetForm() {
		const levelSelect = document.getElementById('levelSelect');
		const customLevelField = document.getElementById('customLevelField');
		const customLevelInput = document.getElementById('customLevel');
		const importBtn = document.getElementById('importBtn');
		
		// 重置选择
		levelSelect.value = '';
		M.FormSelect.init(levelSelect);
		
		// 隐藏自定义输入
		customLevelField.style.display = 'none';
		customLevelInput.value = '';
		
		// 禁用导入按钮
		importBtn.disabled = true;
	}

	/**
	 * 验证单词数据
	 * @param {Object} wordData - 单词数据
	 * @param {number} index - 数据索引
	 * @param {string} levelId - 词汇等级ID
	 * @returns {Object} 验证结果
	 */
	function validateWord(wordData, index, levelId) {
		if (!wordData) {
			return {
				isValid: false,
				error: `第${index + 1}行数据为空`
			};
		}

		const missingFields = [];
		if (!wordData.word) missingFields.push('word');
		if (!wordData.meaning) missingFields.push('meaning');

		if (missingFields.length > 0) {
			return {
				isValid: false,
				error: `第${index + 1}行缺少必要字段: ${missingFields.join(', ')}`
			};
		}

		const typeErrors = [];
		if (typeof wordData.word !== 'string') typeErrors.push(`word(${typeof wordData.word})`);
		if (typeof wordData.meaning !== 'string') typeErrors.push(`meaning(${typeof wordData.meaning})`);

		if (typeErrors.length > 0) {
			return {
				isValid: false,
				error: `第${index + 1}行字段类型错误: ${typeErrors.join(', ')}`
			};
		}

		const effectiveLevelId = levelId || wordData.level_id;

		const cleaned = {
			word: wordData.word.trim(),
			meaning: wordData.meaning.trim(),
			phonetic: wordData.phonetic ? String(wordData.phonetic).trim() : null,
			phrase: wordData.phrase ? String(wordData.phrase).trim() : null,
			example: wordData.example ? String(wordData.example).trim() : null,
			morphology: wordData.morphology === 'NaN' ? null : (wordData.morphology ? String(wordData.morphology).trim() : null),
			note: wordData.note ? String(wordData.note).trim() : null,
			level_id: effectiveLevelId,
			chapter_id: null
		};

		return { isValid: true, data: cleaned };
	}

	/**
	 * 处理文件上传并预览
	 * @param {Event} e - 文件上传事件
	 */
	function handleFileUpload(e) {
		const file = e.target.files[0];
		if (!file) return;
		
		showLoading('正在解析文件...');
		
		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				let data;
				if (file.name.endsWith('.json')) {
					// 处理JSON文件
					let content = e.target.result;
					// 替换NaN为null
					content = content.replace(/: NaN/g, ': null');
					data = JSON.parse(content);
					
					if (!Array.isArray(data)) {
						throw new Error('JSON文件必须包含单词数组');
					}
				} else {
					// 处理Excel文件
					const workbook = XLSX.read(e.target.result, {
						type: 'binary',
						cellDates: true
					});
					const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
					data = XLSX.utils.sheet_to_json(firstSheet);
				}
				
				processPreviewData(data);
			} catch (error) {
				console.error('文件解析错误:', error);
				showToast('文件解析失败: ' + error.message, 'error');
				hideLoading();
			}
		};
		
		if (file.name.endsWith('.json')) {
			reader.readAsText(file);
		} else {
			reader.readAsBinaryString(file);
		}
	}

	/**
	 * 处理预览数据
	 * @param {Array} data - 要预览的数据
	 */
	function processPreviewData(data) {
		const levelId = getSelectedLevel();
		if (!levelId) {
			showToast('请先选择词汇级别', 'error');
			hideLoading();
			return;
		}

		// 验证和转换数据
		previewState.data = data.map((item, index) => {
			const validation = validateWord(item, index, levelId);
			return {
				...item,
				validation: validation,
				isValid: validation.isValid,
				processedData: validation.isValid ? validation.data : null,
				error: validation.isValid ? null : validation.error
			};
		});
		
		// 更新统计信息
		previewState.validCount = previewState.data.filter(item => item.isValid).length;
		previewState.invalidCount = previewState.data.length - previewState.validCount;
		previewState.totalPages = Math.ceil(previewState.data.length / previewState.pageSize);
		previewState.currentPage = 1;

		// 分析章节信息
		const chaptersInfo = new Map();
		previewState.data.forEach((item, index) => {
			if (item.isValid && item.processedData.chapter_id) {
				const chapterId = item.processedData.chapter_id;
				if (!chaptersInfo.has(chapterId)) {
					chaptersInfo.set(chapterId, {
						count: 1,
						firstWordIndex: index
					});
				} else {
					chaptersInfo.get(chapterId).count++;
				}
			}
		});

		// 显示章节统计信息
		console.log('检测到的章节信息：');
		chaptersInfo.forEach((info, chapterId) => {
			console.log(`章节 ${chapterId}: 包含 ${info.count} 个单词，首个单词位于第 ${info.firstWordIndex + 1} 行`);
		});
		
		// 显示预览
		updatePreviewDisplay();
		hideLoading();
		
		// 根据数据有效性启用/禁用导入按钮
		const importBtn = document.getElementById('importBtn');
		importBtn.disabled = previewState.validCount === 0;
	}

	/**
	 * 更新预览显示
	 */
	function updatePreviewDisplay() {
		const previewArea = document.getElementById('previewArea');
		const previewTableBody = document.getElementById('previewTableBody');
		const totalCount = document.getElementById('totalCount');
		const validCount = document.getElementById('validCount');
		const invalidCount = document.getElementById('invalidCount');

		// 显示预览区域
		previewArea.style.display = 'block';

		// 更新统计数据
		totalCount.textContent = previewState.data.length;
		validCount.textContent = previewState.validCount;
		invalidCount.textContent = previewState.invalidCount;

		// 清空预览表格
		previewTableBody.innerHTML = '';

		// 计算当前页的数据范围
		const startIndex = (previewState.currentPage - 1) * previewState.pageSize;
		const endIndex = Math.min(startIndex + previewState.pageSize, previewState.data.length);

		// 添加当前页的数据到表格
		for (let i = startIndex; i < endIndex; i++) {
			const item = previewState.data[i];
			const tr = document.createElement('tr');
			if (!item.isValid) {
				tr.classList.add('invalid-row');
			}

			// 添加单词列
			tr.innerHTML = `
				<td>${item.word || ''}</td>
				<td>${item.phonetic || ''}</td>
				<td>${item.meaning || ''}</td>
				<td>${item.processedData ? item.processedData.level_id : ''}</td>
				<td>${item.processedData ? item.processedData.chapter_id : ''}</td>
				<td class="status-cell">
					${item.isValid 
						? '<i class="material-icons status-valid">check_circle</i>'
						: `<span class="status-invalid">${item.error}</span>`}
				</td>
			`;

			previewTableBody.appendChild(tr);
		}

		// 更新分页
		updatePreviewPagination();
	}

	/**
	 * 更新预览分页
	 */
	function updatePreviewPagination() {
		const paginationElement = document.getElementById('previewPagination');
		paginationElement.innerHTML = '';

		// 如果只有一页，不显示分页
		if (previewState.totalPages <= 1) {
			return;
		}

		// 添加上一页按钮
		const prevLi = document.createElement('li');
		prevLi.className = previewState.currentPage === 1 ? 'disabled' : 'waves-effect';
		prevLi.innerHTML = '<a href="#!"><i class="material-icons">chevron_left</i></a>';
		if (previewState.currentPage > 1) {
			prevLi.addEventListener('click', () => {
				previewState.currentPage--;
				updatePreviewDisplay();
			});
		}
		paginationElement.appendChild(prevLi);

		// 添加页码按钮
		for (let i = 1; i <= previewState.totalPages; i++) {
			const li = document.createElement('li');
			li.className = i === previewState.currentPage ? 'active' : 'waves-effect';
			li.innerHTML = `<a href="#!">${i}</a>`;
			if (i !== previewState.currentPage) {
				li.addEventListener('click', () => {
					previewState.currentPage = i;
					updatePreviewDisplay();
				});
			}
			paginationElement.appendChild(li);
		}

		// 添加下一页按钮
		const nextLi = document.createElement('li');
		nextLi.className = previewState.currentPage === previewState.totalPages ? 'disabled' : 'waves-effect';
		nextLi.innerHTML = '<a href="#!"><i class="material-icons">chevron_right</i></a>';
		if (previewState.currentPage < previewState.totalPages) {
			nextLi.addEventListener('click', () => {
				previewState.currentPage++;
				updatePreviewDisplay();
			});
		}
		paginationElement.appendChild(nextLi);
	}

	/**
	 * 执行实际的导入操作
	 */
	async function importData() {
		if (previewState.validCount === 0) {
			showToast('没有有效的数据可以导入', 'error');
			return;
		}
		
		showLoading('正在导入数据...');
		
		try {
			// 只导入有效的数据
			const validData = previewState.data
				.filter(item => item.isValid)
				.map(item => item.processedData);
			
			// 调用API进行导入
			const response = await fetch('/api/words/batch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('authToken')}`
				},
				body: JSON.stringify({
					words: validData,
					level: getSelectedLevel()
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				showToast(`成功导入 ${validData.length} 条数据`, 'success');
				resetForm();
				// 刷新词汇列表
				loadWords();
			} else {
				throw new Error(result.message || '导入失败');
			}
		} catch (error) {
			console.error('导入失败:', error);
			showToast('导入失败: ' + error.message, 'error');
		} finally {
			hideLoading();
		}
	}

	// 修改事件监听器设置
	function setupEventListeners() {
		// 退出登录按钮
		const logoutBtn = document.querySelector('.logout-btn');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', handleLogout);
		}

		// 文件上传事件
		const fileInput = document.getElementById('fileInput');
		if (fileInput) {
			fileInput.addEventListener('change', handleFileUpload);
		}

		// 导入按钮事件
		const importBtn = document.getElementById('importBtn');
		if (importBtn) {
			importBtn.addEventListener('click', importData);
		}

		// 重置按钮事件
		const resetBtn = document.getElementById('resetBtn');
		if (resetBtn) {
			resetBtn.addEventListener('click', resetForm);
		}

		// 创建新章节选项切换
		const createNewChapter = document.getElementById('create-new-chapter');
		if (createNewChapter) {
			createNewChapter.addEventListener('change', toggleNewChapterForm);
		}

		// 级别筛选变化时更新章节下拉框
		const importLevelSelect = document.getElementById('import-level-select');
		if (importLevelSelect) {
			importLevelSelect.addEventListener('change', updateChapterDropdown);
		}

		// 级别选择变化时处理自定义级别输入框显示
		const levelSelect = document.getElementById('word-level');
		if (levelSelect) {
			levelSelect.addEventListener('change', function(e) {
				const customLevelContainer = document.getElementById('custom-level-container');
				if (e.target.value === 'custom') {
					customLevelContainer.style.display = 'block';
				} else {
					customLevelContainer.style.display = 'none';
				}
			});
		}

		// 章节选择变化时处理自定义章节输入框显示
		const chapterSelect = document.getElementById('word-chapter');
		if (chapterSelect) {
			chapterSelect.addEventListener('change', function(e) {
				const customChapterContainer = document.getElementById('custom-chapter-container');
				if (e.target.value === 'custom') {
					customChapterContainer.style.display = 'block';
				} else {
					customChapterContainer.style.display = 'none';
				}
			});
		}

		// 确认添加自定义级别
		const confirmCustomLevel = document.getElementById('confirm-custom-level');
		if (confirmCustomLevel) {
			confirmCustomLevel.addEventListener('click', async function() {
				const levelName = document.getElementById('custom-level-name').value.trim();
				const levelDescription = document.getElementById('custom-level-description').value.trim();
				
				if (!levelName) {
					showToast('请输入级别名称', 'error');
					return;
				}

				try {
					showLoading('正在创建新级别...');
					const newLevel = await createLevel(levelName, levelDescription);
					if (newLevel) {
						// 更新级别下拉框
						await loadVocabularyLevels();
						// 选中新创建的级别
						const wordLevel = document.getElementById('word-level');
						if (wordLevel) {
							wordLevel.value = newLevel.id;
							M.FormSelect.init(wordLevel);
						}
						// 隐藏自定义输入框
						document.getElementById('custom-level-container').style.display = 'none';
						showToast('新级别创建成功', 'success');
					}
				} catch (error) {
					console.error('创建级别失败:', error);
					showToast('创建级别失败: ' + error.message, 'error');
				} finally {
					hideLoading();
				}
			});
		}

		// 确认添加自定义章节
		const confirmCustomChapter = document.getElementById('confirm-custom-chapter');
		if (confirmCustomChapter) {
			confirmCustomChapter.addEventListener('click', async function() {
				const chapterName = document.getElementById('custom-chapter-name').value.trim();
				const chapterDescription = document.getElementById('custom-chapter-description').value.trim();
				const levelId = document.getElementById('word-level').value;
				
				if (!chapterName) {
					showToast('请输入章节名称', 'error');
					return;
				}
				
				if (!levelId || levelId === 'custom') {
					showToast('请先选择或创建级别', 'error');
					return;
				}

				try {
					showLoading('正在创建新章节...');
					const newChapter = await createChapter(chapterName, chapterDescription, levelId);
					if (newChapter) {
						// 更新章节下拉框
						await loadChaptersByLevel(levelId);
						// 选中新创建的章节
						const wordChapter = document.getElementById('word-chapter');
						if (wordChapter) {
							wordChapter.value = newChapter.id;
							M.FormSelect.init(wordChapter);
						}
						// 隐藏自定义输入框
						document.getElementById('custom-chapter-container').style.display = 'none';
						showToast('新章节创建成功', 'success');
					}
				} catch (error) {
					console.error('创建章节失败:', error);
					showToast('创建章节失败: ' + error.message, 'error');
				} finally {
					hideLoading();
				}
			});
		}

		// 保存单词按钮
		const saveWordBtn = document.getElementById('btn-save-word');
		if (saveWordBtn) {
			saveWordBtn.addEventListener('click', saveWord);
		}

		// 确认删除按钮
		const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
		if (confirmDeleteBtn) {
			confirmDeleteBtn.addEventListener('click', function() {
				const type = this.dataset.type;
				const id = this.dataset.id;
				
				if (!type || !id) {
					showToast('删除失败：缺少必要参数', 'error');
					return;
				}

				switch (type) {
					case 'word':
						deleteWord(id);
						break;
					case 'level':
						deleteLevel(id);
						break;
					case 'chapter':
						deleteChapter(id);
						break;
					default:
						showToast('未知的删除类型', 'error');
				}
			});
		}

		// 搜索框事件
		const searchInput = document.getElementById('search-input');
		if (searchInput) {
			searchInput.addEventListener('input', debounce(function() {
				filterWords();
			}, 500));
		}

		// 级别筛选事件
		const levelFilter = document.getElementById('level-filter');
		if (levelFilter) {
			levelFilter.addEventListener('change', handleLevelChange);
		}

		// 章节筛选事件
		const chapterFilter = document.getElementById('chapter-filter');
		if (chapterFilter) {
			chapterFilter.addEventListener('change', filterWords);
		}

		// 添加单词按钮
		const addWordBtn = document.getElementById('btn-add-word');
		if (addWordBtn) {
			addWordBtn.addEventListener('click', showAddWordModal);
		}

		// 添加级别按钮
		const addLevelBtn = document.getElementById('btn-add-level');
		if (addLevelBtn) {
			addLevelBtn.addEventListener('click', showAddLevelModal);
		}

		// 添加章节按钮
		const addChapterBtn = document.getElementById('btn-add-chapter');
		if (addChapterBtn) {
			addChapterBtn.addEventListener('click', showAddChapterModal);
		}

		// 导入类型选择事件
		const importType = document.getElementById('importType');
		if (importType) {
			importType.addEventListener('change', function(e) {
				const fileInput = document.getElementById('fileInput');
				if (e.target.value === 'excel') {
					fileInput.accept = '.xlsx,.xls';
				} else {
					fileInput.accept = '.json';
				}
				// 清空已选择的文件
				fileInput.value = '';
				// 重置预览区域
				document.getElementById('previewArea').style.display = 'none';
			});
		}

		// 级别选择事件（导入时）
		const importLevelSelectElement = document.getElementById('levelSelect');
		if (importLevelSelectElement) {
			importLevelSelectElement.addEventListener('change', function(e) {
				const customLevelField = document.getElementById('customLevelField');
				if (e.target.value === 'custom') {
					customLevelField.style.display = 'block';
					document.getElementById('customLevel').focus();
				} else {
					customLevelField.style.display = 'none';
				}
				// 更新导入按钮状态
				const importBtn = document.getElementById('importBtn');
				if (importBtn) {
					importBtn.disabled = !e.target.value || (e.target.value === 'custom' && !document.getElementById('customLevel').value.trim());
				}
			});
		}

		// 自定义级别输入事件
		const customLevelInput = document.getElementById('customLevel');
		if (customLevelInput) {
			customLevelInput.addEventListener('input', function(e) {
				const importBtn = document.getElementById('importBtn');
				if (importBtn) {
					importBtn.disabled = !e.target.value.trim();
				}
			});
		}

		// 分页事件
		const prevPageBtn = document.getElementById('prevPage');
		if (prevPageBtn) {
			prevPageBtn.addEventListener('click', function() {
				if (paginationState.currentPage > 1) {
					handlePageChange(paginationState.currentPage - 1);
				}
			});
		}

		const nextPageBtn = document.getElementById('nextPage');
		if (nextPageBtn) {
			nextPageBtn.addEventListener('click', function() {
				if (paginationState.currentPage < paginationState.getTotalPages()) {
					handlePageChange(paginationState.currentPage + 1);
				}
			});
		}
	}