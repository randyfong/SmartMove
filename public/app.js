// SmartMove Dashboard Client Application Logic
document.addEventListener("DOMContentLoaded", () => {
    
    // Core Application State
    const state = {
        settings: {
            geminiApiKeyConfigured: false,
            apifyApiTokenConfigured: false,
            scalekitMockMode: true,
            active_models: {}
        },
        currentRun: null,
        listings: [],
        checkpoints: [],
        selectedListing: null
    };

    // DOM Elements
    // Header & Info
    const statusGemini = document.getElementById("status-gemini");
    const statusApify = document.getElementById("status-apify");
    const statusScalekit = document.getElementById("status-scalekit");
    const btnSettings = document.getElementById("btn-settings");
    
    // Preference Form
    const prefForm = document.getElementById("preferences-form");
    const inputCity = document.getElementById("input-city");
    const inputBudget = document.getElementById("input-budget");
    const budgetValVal = document.getElementById("budget-val");
    const inputCommute = document.getElementById("input-commute");
    const commuteValVal = document.getElementById("commute-val");
    const inputLaundry = document.getElementById("input-laundry");
    const inputGym = document.getElementById("input-gym");
    const inputSearch = document.getElementById("input-search");
    const btnRunAgent = document.getElementById("btn-run-agent");
    const btnRunText = btnRunAgent.querySelector(".btn-text");
    const btnRunLoader = btnRunAgent.querySelector(".btn-loader");

    // Pipeline steps
    const stepScrape = document.getElementById("step-scrape");
    const stepAudit = document.getElementById("step-audit");
    const stepGit = document.getElementById("step-git");
    const consoleLogs = document.getElementById("console-logs");
    const btnClearLog = document.getElementById("btn-clear-log");

    // Decision Tree / Results
    const valTotalEval = document.getElementById("val-total-eval");
    const valApprovedCount = document.getElementById("val-approved-count");
    const valFilteredCount = document.getElementById("val-filtered-count");
    const decisionTreeContainer = document.getElementById("decision-tree-container");
    const treeSearchInput = document.getElementById("tree-search-input");
    const treeFilterBtns = document.querySelectorAll(".tree-filter-btn");

    // Git Checkpoints
    const btnRefreshCheckpoints = document.getElementById("btn-refresh-checkpoints");
    const checkpointsList = document.getElementById("checkpoints-list");

    // Settings Dialog
    const dialogSettings = document.getElementById("dialog-settings");
    const settingsForm = document.getElementById("settings-form");
    const inputGeminiKey = document.getElementById("input-gemini-key");
    const inputApifyToken = document.getElementById("input-apify-token");
    const inputScalekitMock = document.getElementById("input-scalekit-mock");
    const btnCloseDialogs = document.querySelectorAll(".btn-close-dialog");

    // Audit Modal
    const dialogAudit = document.getElementById("dialog-audit");
    const auditModalTitle = document.getElementById("audit-modal-title");
    const auditModalSubtitle = document.getElementById("audit-modal-subtitle");
    const auditPropImage = document.getElementById("audit-prop-image");
    const auditPropAddress = document.getElementById("audit-prop-address");
    const auditPropNeighborhood = document.getElementById("audit-prop-neighborhood");
    const auditPropAmenities = document.getElementById("audit-prop-amenities");
    const auditScoreCircle = document.getElementById("audit-score-circle");
    const auditScoreNumber = document.getElementById("audit-score-number");
    const auditStatusBadge = document.getElementById("audit-status-badge");
    const accordionBudget = document.getElementById("txt-audit-budget");
    const accordionLaundry = document.getElementById("txt-audit-laundry");
    const accordionGym = document.getElementById("txt-audit-gym");
    const accordionCommute = document.getElementById("txt-audit-commute");
    const accordionOverall = document.getElementById("txt-audit-overall");
    const accordionSearch = document.getElementById("txt-audit-search");
    const badgeAuditBudget = document.getElementById("badge-audit-budget");
    const badgeAuditLaundry = document.getElementById("badge-audit-laundry");
    const badgeAuditGym = document.getElementById("badge-audit-gym");
    const badgeAuditCommute = document.getElementById("badge-audit-commute");
    const badgeAuditSearch = document.getElementById("badge-audit-search");
    const accordionItemSearch = document.getElementById("accordion-item-search");
    const auditGitHash = document.getElementById("audit-git-hash");
    const auditGitMsg = document.getElementById("audit-git-msg");
    const auditGitDate = document.getElementById("audit-git-date");
    const btnBookingTrigger = document.getElementById("btn-booking-trigger");

    // Booking Dialog
    const dialogBooking = document.getElementById("dialog-booking");
    const bookingForm = document.getElementById("booking-form");
    const bookingBannerTitle = document.getElementById("booking-banner-title");
    const bookingBannerDesc = document.getElementById("booking-banner-desc");
    const bookingName = document.getElementById("booking-name");
    const bookingEmail = document.getElementById("booking-email");
    const btnBookingSubmit = document.getElementById("btn-booking-submit");

    // Success Dialog
    const dialogSuccess = document.getElementById("dialog-success");
    const succTitle = document.getElementById("succ-title");
    const succRecipient = document.getElementById("succ-recipient");
    const succTime = document.getElementById("succ-time");

    // Trace dialog
    const dialogTrace = document.getElementById("dialog-trace");
    const traceModalFilename = document.getElementById("trace-modal-filename");
    const traceMetaRunId = document.getElementById("trace-meta-runid");
    const traceMetaStep = document.getElementById("trace-meta-step");
    const traceMetaTime = document.getElementById("trace-meta-time");
    const traceJsonCode = document.getElementById("trace-json-code");

    // -------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------
    fetchSettingsStatus();
    fetchCheckpoints();

    // Setup interactive range indicators
    inputBudget.addEventListener("input", (e) => {
        budgetValVal.textContent = `$${parseInt(e.target.value).toLocaleString()}/mo`;
    });

    inputCommute.addEventListener("input", (e) => {
        commuteValVal.textContent = `${e.target.value} mins`;
    });

    // Real-time client-side listing search filtering
    if (treeSearchInput) {
        treeSearchInput.addEventListener("input", () => {
            const activeFilterBtn = document.querySelector(".tree-filter-btn.active");
            const activeFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : "all";
            renderDecisionTree(activeFilter);
        });
    }

    // Handle dialog close buttons globally
    btnCloseDialogs.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const dialog = e.target.closest("dialog");
            if (dialog) dialog.close();
        });
    });

    // -------------------------------------------------------------
    // Logging Utility
    // -------------------------------------------------------------
    function addLog(source, message, type = "system") {
        const timestamp = new Date().toLocaleTimeString();
        const logRow = document.createElement("div");
        logRow.className = `log-row log-${type}`;
        logRow.innerHTML = `[${timestamp}] <strong>${source}</strong>: ${message}`;
        consoleLogs.appendChild(logRow);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    btnClearLog.addEventListener("click", () => {
        consoleLogs.innerHTML = "";
        addLog("system", "Log console cleared.", "system");
    });

    // -------------------------------------------------------------
    // API Services
    // -------------------------------------------------------------
    
    // Fetch Settings Active State
    async function fetchSettingsStatus() {
        try {
            const res = await fetch("/api/settings/status");
            if (res.ok) {
                const data = await res.json();
                state.settings = data;
                updateStatusPills();
            }
        } catch (err) {
            console.error("Failed to fetch settings status", err);
            addLog("system", "Warning: Could not contact FastAPI backend status endpoint.", "error");
        }
    }

    // Update Pills in UI
    function updateStatusPills() {
        if (state.settings.geminiApiKeyConfigured) {
            statusGemini.classList.remove("status-inactive");
            statusGemini.classList.add("status-active");
            statusGemini.title = "Connected to live Gemini API model";
        } else {
            statusGemini.classList.remove("status-active");
            statusGemini.classList.add("status-inactive");
            statusGemini.title = "Using offline High-Fidelity Gemini mock reasoning simulator";
        }

        if (state.settings.apifyApiTokenConfigured) {
            statusApify.classList.remove("status-inactive");
            statusApify.classList.add("status-active");
            statusApify.title = "Connected to live Apify Realtime apartment scraper";
        } else {
            statusApify.classList.remove("status-active");
            statusApify.classList.add("status-inactive");
            statusApify.title = "Using seeding database with premium sample listings";
        }

        if (state.settings.scalekitMockMode) {
            statusScalekit.classList.remove("status-inactive");
            statusScalekit.classList.add("status-active");
            statusScalekit.querySelector(".status-label").textContent = "Scalekit Simulator";
        } else {
            statusScalekit.classList.remove("status-active");
            statusScalekit.classList.add("status-inactive");
            statusScalekit.querySelector(".status-label").textContent = "Scalekit Live";
        }
    }

    // Refresh committed checkpoints table
    async function fetchCheckpoints() {
        try {
            const res = await fetch("/api/agent/checkpoints");
            if (res.ok) {
                const data = await res.json();
                state.checkpoints = data;
                renderCheckpointsTable();

                // Auto-hydrate search results from git history on initial page load if state is empty
                if (state.listings.length === 0 && data.length > 0) {
                    const latestFinalized = [...data].reverse().find(cp => cp.step_name === "Search Recommendations Finalized");
                    if (latestFinalized && latestFinalized.data && latestFinalized.data.all_results) {
                        state.currentRun = latestFinalized.run_id;
                        state.listings = latestFinalized.data.all_results;
                        renderDecisionTree("all");
                        addLog("system", `Loaded cached relocation results from trace checkpoint: <strong>${latestFinalized.run_id}</strong>.`, "system");
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch checkpoints", err);
        }
    }

    // Open Config drawer
    btnSettings.addEventListener("click", () => {
        // Pre-fill keys from local state (we don't get the keys back from server for security, so just leave placeholder)
        inputGeminiKey.value = "";
        inputApifyToken.value = "";
        inputScalekitMock.checked = state.settings.scalekitMockMode;
        
        dialogSettings.showModal();
    });

    // Save Settings Form
    settingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const payload = {
            geminiApiKey: inputGeminiKey.value,
            apifyApiToken: inputApifyToken.value,
            scalekitMockMode: inputScalekitMock.checked
        };

        try {
            const res = await fetch("/api/settings/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                addLog("system", data.message, "system");
                dialogSettings.close();
                await fetchSettingsStatus();
            } else {
                const errData = await res.json();
                addLog("system", `Failed to save keys: ${errData.detail}`, "error");
            }
        } catch (err) {
            addLog("system", `Error saving credentials: ${err.message}`, "error");
        }
    });

    // Refresh Checkpoints manual click
    btnRefreshCheckpoints.addEventListener("click", () => {
        fetchCheckpoints();
        addLog("system", "Manually fetched latest git audit trace checkpoints.", "system");
    });

    // -------------------------------------------------------------
    // Executing the Relocation AI Agent Search
    // -------------------------------------------------------------
    prefForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Reset steps UI and set loaders
        btnRunText.textContent = "Agent Working...";
        btnRunAgent.disabled = true;
        btnRunLoader.classList.remove("hidden");

        // UI Steps animations
        resetPipelineSteps();
        
        addLog("agent", `Targeting ${inputCity.value} relocation with budget of ${budgetValVal.textContent}.`, "system");

        // Scraper step active
        stepScrape.classList.add("active");
        const isApifyLive = state.settings.apifyApiTokenConfigured;
        addLog("scraper", isApifyLive ? "Launching live Apify Realtor API scraper..." : "Loading premium listing seed databases...", "scraper");

        const requirements = {
            city: inputCity.value,
            budget: parseFloat(inputBudget.value),
            requireLaundry: inputLaundry.checked,
            requireGym: inputGym.checked,
            maxCommute: parseFloat(inputCommute.value),
            searchQuery: inputSearch ? inputSearch.value.trim() : ""
        };

        try {
            // Trigger Agent Pipeline
            const response = await fetch("/api/agent/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requirements)
            });

            if (!response.ok) {
                const errData = await response.ok ? {} : await response.json();
                throw new Error(errData.detail || "Server pipeline error");
            }

            const data = await response.json();
            state.currentRun = data.run_id;
            state.listings = data.results;

            // Wait a slight fraction to let user trace step changes
            setTimeout(() => {
                stepScrape.classList.remove("active");
                stepScrape.classList.add("completed");
                
                stepAudit.classList.add("active");
                const isGeminiLive = state.settings.geminiApiKeyConfigured;
                addLog("agent", isGeminiLive ? "Processing constraints evaluation live on Gemini 2.5 Flash..." : "Running high-fidelity local constraint rule matrix...", "audit");
            }, 1000);

            setTimeout(() => {
                stepAudit.classList.remove("active");
                stepAudit.classList.add("completed");

                stepGit.classList.add("active");
                addLog("git", `Securing audit traces inside local repo...`, "git");
            }, 2000);

            setTimeout(async () => {
                stepGit.classList.remove("active");
                stepGit.classList.add("completed");

                // Print individual audit details to console
                state.listings.forEach(item => {
                    const statusStr = item.approved ? "APPROVED" : "FILTERED";
                    const statusType = item.approved ? "git" : "error";
                    addLog("agent_audit", `Property ${item.id} (${item.title}): Compatibility Score ${item.score}/100. [${statusStr}]`, statusType);
                });

                addLog("git", `Agent trace checkpoints committed into git history for audit tracking.`, "git");
                
                // Stop loaders and render
                btnRunText.textContent = "Execute Relocation Search";
                btnRunAgent.disabled = false;
                btnRunLoader.classList.add("hidden");

                renderDecisionTree("all");
                await fetchCheckpoints();
            }, 3000);

        } catch (err) {
            console.error(err);
            addLog("system", `Relocation Pipeline Failed: ${err.message}`, "error");
            
            btnRunText.textContent = "Execute Relocation Search";
            btnRunAgent.disabled = false;
            btnRunLoader.classList.add("hidden");
            resetPipelineSteps();
        }
    });

    function resetPipelineSteps() {
        stepScrape.className = "pipeline-step";
        stepAudit.className = "pipeline-step";
        stepGit.className = "pipeline-step";
    }

    // -------------------------------------------------------------
    // Render Functions
    // -------------------------------------------------------------

    // Render interactive decision tree cards
    function renderDecisionTree(filter = "all") {
        decisionTreeContainer.innerHTML = "";

        if (state.listings.length === 0) {
            decisionTreeContainer.innerHTML = `
                <div class="tree-empty-state">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>No listings matches. Try adjustments on constraints to expand matches.</p>
                </div>`;
            return;
        }

        // Apply filters
        let filteredListings = state.listings;
        if (filter === "approved") {
            filteredListings = state.listings.filter(l => l.approved);
        } else if (filter === "rejected") {
            filteredListings = state.listings.filter(l => !l.approved);
        }

        // Apply instant client-side search text filtering
        const searchVal = treeSearchInput ? treeSearchInput.value.toLowerCase().trim() : "";
        if (searchVal) {
            filteredListings = filteredListings.filter(l => 
                l.title.toLowerCase().includes(searchVal) ||
                l.address.toLowerCase().includes(searchVal) ||
                l.neighborhood.toLowerCase().includes(searchVal) ||
                l.amenities.some(a => a.toLowerCase().includes(searchVal)) ||
                (l.reasoning && l.reasoning.overall && l.reasoning.overall.toLowerCase().includes(searchVal))
            );
        }

        // Update counts
        valTotalEval.textContent = state.listings.length;
        valApprovedCount.textContent = state.listings.filter(l => l.approved).length;
        valFilteredCount.textContent = state.listings.filter(l => !l.approved).length;

        if (filteredListings.length === 0) {
            decisionTreeContainer.innerHTML = `
                <div class="tree-empty-state">
                    <p>No listings match the selected filter category.</p>
                </div>`;
            return;
        }

        // Draw cards
        filteredListings.forEach(item => {
            const card = document.createElement("article");
            card.className = `listing-card glass-card ${item.approved ? 'approved' : 'rejected'}`;
            
            // Build features
            const features = item.amenities.slice(0, 2).join(" &bull; ");

            // Build rejection reasons comments if not approved
            let rejectionReasonCommentsHtml = '';
            if (!item.approved && item.reasoning) {
                const failedComments = [];
                // Check each criterion
                const criteria = [
                    { key: 'budget', label: 'Budget' },
                    { key: 'laundry', label: 'Laundry' },
                    { key: 'climbing_gym', label: 'Active Fitness' },
                    { key: 'commute', label: 'Commute' }
                ];
                
                criteria.forEach(c => {
                    const comment = item.reasoning[c.key];
                    if (comment && (comment.includes("REJECTED") || comment.includes("FAIL") || comment.toLowerCase().includes("fail") || comment.toLowerCase().includes("exceeds") || comment.toLowerCase().includes("lacks") || comment.toLowerCase().includes("not meet"))) {
                        // Let's clean the comment prefix if it starts with REJECTED:
                        let cleanText = comment;
                        if (comment.startsWith("REJECTED:")) {
                            cleanText = comment.replace(/^REJECTED:\s*/, "");
                        } else if (comment.startsWith("FAIL:")) {
                            cleanText = comment.replace(/^FAIL:\s*/, "");
                        }
                        
                        failedComments.push(`
                            <div class="rejection-comment-item">
                                <span class="comment-bullet"></span>
                                <span class="comment-text"><strong>${c.label}:</strong> ${cleanText}</span>
                            </div>
                        `);
                    }
                });
                
                // Fallback to overall summary if no specific criteria were flagged as rejected in text
                if (failedComments.length === 0 && item.reasoning.overall) {
                    failedComments.push(`
                        <div class="rejection-comment-item">
                            <span class="comment-bullet"></span>
                            <span class="comment-text">${item.reasoning.overall}</span>
                        </div>
                    `);
                }
                
                rejectionReasonCommentsHtml = `
                    <div class="card-rejection-comments">
                        <div class="rejection-comments-header">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <span>Filter Analysis</span>
                        </div>
                        <div class="rejection-comments-list">
                            ${failedComments.join('')}
                        </div>
                    </div>
                `;
            }

            // Build matched selection criteria comments if approved
            let matchedCriteriaHtml = '';
            if (item.approved && item.reasoning) {
                const matchedComments = [];
                // Check each criterion
                const criteria = [
                    { key: 'budget', label: 'Budget' },
                    { key: 'laundry', label: 'Laundry' },
                    { key: 'climbing_gym', label: 'Active Fitness' },
                    { key: 'commute', label: 'Commute' }
                ];
                
                if (item.reasoning.search_query) {
                    criteria.push({ key: 'search_query', label: 'Custom Preference' });
                }
                
                criteria.forEach(c => {
                    const comment = item.reasoning[c.key];
                    if (comment && !comment.includes("REJECTED") && !comment.includes("FAIL") && !comment.toLowerCase().includes("fail") && !comment.toLowerCase().includes("exceeds") && !comment.toLowerCase().includes("lacks") && !comment.toLowerCase().includes("not meet")) {
                        // Clean the comment prefix if it starts with Approved: or PASS:
                        let cleanText = comment;
                        if (comment.startsWith("Approved:")) {
                            cleanText = comment.replace(/^Approved:\s*/, "");
                        } else if (comment.startsWith("PASS:")) {
                            cleanText = comment.replace(/^PASS:\s*/, "");
                        }
                        
                        matchedComments.push(`
                            <div class="matched-criterion-item">
                                <span class="criterion-bullet"></span>
                                <span class="comment-text"><strong>${c.label}:</strong> ${cleanText}</span>
                            </div>
                        `);
                    }
                });
                
                // Fallback to overall summary if no specific criteria were flagged as matched
                if (matchedComments.length === 0 && item.reasoning.overall) {
                    matchedComments.push(`
                        <div class="matched-criterion-item">
                            <span class="criterion-bullet"></span>
                            <span class="comment-text">${item.reasoning.overall}</span>
                        </div>
                    `);
                }
                
                matchedCriteriaHtml = `
                    <div class="card-matched-criteria">
                        <div class="matched-criteria-header">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <span>Matched Criteria</span>
                        </div>
                        <div class="matched-criteria-list">
                            ${matchedComments.join('')}
                        </div>
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${item.image_url}" alt="${item.title}" class="card-img">
                    <div class="card-compat-tag">${item.score}% Match</div>
                </div>
                <div class="card-details">
                    <div class="card-top-row">
                        <h3>${item.title}</h3>
                        <span class="card-price">$${item.price.toLocaleString()}</span>
                    </div>
                    <span class="card-address">${item.address}</span>
                    
                    <div class="card-features-grid">
                        <div class="card-feature">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                            <span>${item.neighborhood}</span>
                        </div>
                        <div class="card-feature">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>Commute: ${item.commute_time}m</span>
                        </div>
                    </div>
                    ${rejectionReasonCommentsHtml}
                    ${matchedCriteriaHtml}
                </div>
                <div class="card-audit-status-bar">
                    ${item.approved 
                        ? `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Approved Relocation Match`
                        : `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Filtered Out`
                    }
                </div>
            `;

            // Click opens trace modal
            card.addEventListener("click", () => openAuditModal(item));

            decisionTreeContainer.appendChild(card);
        });
    }

    // Toggle Decision Tree filters
    treeFilterBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            treeFilterBtns.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            renderDecisionTree(e.target.dataset.filter);
        });
    });

    // Populate Git checkpoints history table
    function renderCheckpointsTable() {
        checkpointsList.innerHTML = "";

        if (state.checkpoints.length === 0) {
            checkpointsList.innerHTML = `
                <tr class="table-empty">
                    <td colspan="6">No git checkpoints found. Run relocation audit search.</td>
                </tr>`;
            return;
        }

        // Show newest commits first
        const sortedCheckpoints = [...state.checkpoints].reverse();

        sortedCheckpoints.forEach(cp => {
            const tr = document.createElement("tr");
            
            const shortCommit = cp.git_commit ? cp.git_commit.substring(0, 8) : "uncommitted";
            const commitMessage = cp.git_message || "Active working directory state";
            
            const timeStr = cp.timestamp ? new Date(cp.timestamp).toLocaleTimeString() : "";
            const dateStr = cp.timestamp ? new Date(cp.timestamp).toLocaleDateString() : "";
            
            tr.innerHTML = `
                <td class="step-num">Step ${cp.step}</td>
                <td><span class="checkpoint-name">${cp.step_name}</span></td>
                <td>
                    <div class="checkpoint-time">
                        <div>${timeStr}</div>
                        <div style="font-size: 0.7rem; opacity: 0.6;">${dateStr}</div>
                    </div>
                </td>
                <td>
                    <div class="commit-wrapper">
                        <span class="commit-hash">${shortCommit}</span>
                        <span class="commit-msg">${commitMessage}</span>
                    </div>
                </td>
                <td><span class="file-name">${cp.filename}</span></td>
                <td>
                    <button class="btn btn-secondary btn-icon-only btn-inspect-trace" title="Inspect trace file">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                </td>
            `;

            // Bind click to inspector modal
            tr.querySelector(".btn-inspect-trace").addEventListener("click", (e) => {
                e.stopPropagation();
                openTraceInspector(cp);
            });

            checkpointsList.appendChild(tr);
        });
    }

    // -------------------------------------------------------------
    // Audit Trail Details Overlay
    // -------------------------------------------------------------
    function openAuditModal(item) {
        state.selectedListing = item;

        // Set text content
        auditModalTitle.textContent = item.title;
        auditModalSubtitle.textContent = `${item.neighborhood} | $${item.price.toLocaleString()}/mo`;
        auditPropImage.src = item.image_url;
        auditPropAddress.textContent = item.address;
        auditPropNeighborhood.textContent = item.neighborhood;

        // Amenities
        auditPropAmenities.innerHTML = "";
        item.amenities.forEach(amenity => {
            const span = document.createElement("span");
            span.className = "amenity-tag";
            span.textContent = amenity;
            auditPropAmenities.appendChild(span);
        });

        // Set compatibility meter
        auditScoreNumber.textContent = item.score;
        auditScoreCircle.setAttribute("stroke-dasharray", `${item.score}, 100`);

        if (item.approved) {
            auditStatusBadge.className = "status-badge approved";
            auditStatusBadge.textContent = "Approved Match";
            dialogAudit.querySelector(".audit-compatibility-score").className = "audit-compatibility-score approved";
            btnBookingTrigger.style.display = "block";
        } else {
            auditStatusBadge.className = "status-badge rejected";
            auditStatusBadge.textContent = "Filtered Out";
            dialogAudit.querySelector(".audit-compatibility-score").className = "audit-compatibility-score rejected";
            btnBookingTrigger.style.display = "none";
        }

        // Bind accordion/reasons details
        // Find corresponding trace in git checkpoints
        const checkpoint = state.checkpoints.find(cp => 
            cp.step_name.includes(item.id) || (cp.data && cp.data.listing_id === item.id)
        );

        if (checkpoint && checkpoint.data) {
            const reasoning = checkpoint.data.reasoning;
            
            // Set individual reasons
            accordionBudget.textContent = reasoning.budget;
            accordionLaundry.textContent = reasoning.laundry;
            accordionGym.textContent = reasoning.climbing_gym;
            accordionCommute.textContent = reasoning.commute;
            accordionOverall.textContent = reasoning.overall;

            // Handle optional freeform search query reasoning
            if (reasoning.search_query) {
                accordionSearch.textContent = reasoning.search_query;
                setupAuditPill(badgeAuditSearch, !reasoning.search_query.toLowerCase().includes("rejected") && !reasoning.search_query.toLowerCase().includes("fail"));
                accordionItemSearch.style.display = "block";
            } else {
                accordionItemSearch.style.display = "none";
            }

            // Set pass/fail status pills
            setupAuditPill(badgeAuditBudget, !reasoning.budget.toLowerCase().includes("rejected"));
            setupAuditPill(badgeAuditLaundry, !reasoning.laundry.toLowerCase().includes("rejected"));
            setupAuditPill(badgeAuditGym, !reasoning.climbing_gym.toLowerCase().includes("rejected"));
            setupAuditPill(badgeAuditCommute, !reasoning.commute.toLowerCase().includes("rejected"));

            // Git locks values
            auditGitHash.textContent = checkpoint.git_commit ? checkpoint.git_commit.substring(0, 16) + "..." : "local_audit_uncommitted";
            auditGitMsg.textContent = checkpoint.git_message || "Committed locally";
            auditGitDate.textContent = checkpoint.git_date ? checkpoint.git_date : new Date(checkpoint.timestamp).toLocaleString();
        } else {
            // Fallback if checkpoint is not found
            addLog("system", `Trace details missing for listing: ${item.id}`, "error");
        }

        dialogAudit.showModal();
    }

    function setupAuditPill(element, isPass) {
        if (isPass) {
            element.className = "acc-badge approved";
            element.textContent = "PASS";
        } else {
            element.className = "acc-badge rejected";
            element.textContent = "FAIL";
        }
    }

    // -------------------------------------------------------------
    // Scalekit simulated booking workflows
    // -------------------------------------------------------------
    btnBookingTrigger.addEventListener("click", () => {
        dialogAudit.close();
        
        // Setup outreach summary values
        bookingBannerTitle.textContent = `Invitation outreach for ${state.selectedListing.title}`;
        bookingBannerDesc.textContent = `Location: ${state.selectedListing.address}`;
        
        dialogBooking.showModal();
    });

    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Loading simulation
        const btnText = btnBookingSubmit.querySelector(".btn-text");
        const btnLoader = btnBookingSubmit.querySelector(".btn-loader");
        btnText.textContent = "Connecting to Scalekit SSO...";
        btnBookingSubmit.disabled = true;
        btnLoader.classList.remove("hidden");

        const payload = {
            listingId: state.selectedListing.id,
            email: bookingEmail.value,
            name: bookingName.value
        };

        try {
            const res = await fetch("/api/agent/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                
                // Print booking details to console
                addLog("scalekit", `Scalekit authorization successful. Calendar invitation delivered to: ${payload.email}`, "git");
                addLog("scalekit", `Outreach confirmed. Reserved hold: "${data.calendar_event.summary}"`, "system");

                // Populate success modal
                succTitle.textContent = data.calendar_event.summary;
                succRecipient.textContent = data.calendar_event.recipient;
                
                // Formate nice display date
                const dateObj = new Date(data.calendar_event.start);
                succTime.textContent = `${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

                // Close booking form, open success screen
                dialogBooking.close();
                dialogSuccess.showModal();

            } else {
                throw new Error("Failed calendar outreach simulation");
            }
        } catch (err) {
            addLog("system", `Booking failed: ${err.message}`, "error");
        } finally {
            btnText.textContent = "Submit Calendar Hold & Invite";
            btnBookingSubmit.disabled = false;
            btnLoader.classList.add("hidden");
        }
    });

    // -------------------------------------------------------------
    // Trace File Inspector
    // -------------------------------------------------------------
    function openTraceInspector(checkpoint) {
        traceModalFilename.textContent = checkpoint.filename;
        traceMetaRunId.textContent = checkpoint.run_id;
        traceMetaStep.textContent = checkpoint.step;
        traceMetaTime.textContent = new Date(checkpoint.timestamp).toLocaleString();
        
        // Print beautiful raw JSON trace content
        traceJsonCode.textContent = JSON.stringify(checkpoint, null, 2);

        dialogTrace.showModal();
    }
});
