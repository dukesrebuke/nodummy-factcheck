<script>
  import { SOURCES } from '$lib/sources.js';

  let claim = "";
  let result = null;
  let loading = false;
  let error = null;
  let selectedCategory = "all";
  
  // Get unique categories
  const categories = ["all", ...new Set(SOURCES.map(s => s.category))].sort();

  async function submit() {
    if (claim.length < 10) return;
    
    loading = true;
    result = null;
    error = null;

    try {
      const res = await fetch("/.netlify/functions/analyzeClaim", {
        method: "POST",
        body: JSON.stringify({ claim, category: selectedCategory }),
      });

      const text = await res.text();
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("Parse error:", e);
        error = "Failed to parse response from fact-checker";
      }
    } catch (err) {
      console.error("Fetch error:", err);
      error = err.message || "Network error occurred";
    }
    
    loading = false;
  }

  function getVerdictColor(verdict) {
    const v = verdict?.toLowerCase() || '';
    if (v.includes('supported') && !v.includes('unsupported')) return 'text-green-600 bg-green-50 border-green-200';
    if (v.includes('unsupported')) return 'text-red-600 bg-red-50 border-red-200';
    if (v.includes('mixed')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  }

  function getVerdictIcon(verdict) {
    const v = verdict?.toLowerCase() || '';
    if (v.includes('supported') && !v.includes('unsupported')) return '✓';
    if (v.includes('unsupported')) return '✗';
    if (v.includes('mixed')) return '⚠';
    return '?';
  }

  function getCategoryLabel(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
</script>

<svelte:head>
  <title>Fact Checker - Evidence-Based Claim Verification</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <!-- Header -->
  <div class="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <span class="text-white text-xl font-bold">✓</span>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Fact Checker</h1>
            <p class="text-xs text-gray-500">Evidence-based verification</p>
          </div>
        </div>
        <div class="text-xs text-gray-500 hidden lg:block">
          70+ authoritative sources
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-6xl mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
    <!-- Input Card -->
    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-8 mb-6">
      <!-- Category Filter -->
      <div class="mb-6">
        <label class="block text-sm font-semibold text-gray-900 mb-3">
          Focus on specific topic (optional)
        </label>
        <div class="flex flex-wrap gap-2">
          {#each categories as cat}
            <button
              on:click={() => selectedCategory = cat}
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all {selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            >
              {getCategoryLabel(cat)}
            </button>
          {/each}
        </div>
      </div>

      <div class="mb-6">
        <label for="claim" class="block text-sm font-semibold text-gray-900 mb-3">
          Enter a claim to fact-check
        </label>
        <textarea
          id="claim"
          bind:value={claim}
          on:keydown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              submit();
            }
          }}
          rows="4"
          placeholder="Example: The unemployment rate in the United States is over 20%"
          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
        ></textarea>
        <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{claim.length} characters {claim.length >= 10 ? '✓' : '(min 10)'}</span>
          <span class="hidden sm:inline">⌘/Ctrl + Enter to submit</span>
        </div>
      </div>

      <button
        on:click={submit}
        disabled={loading || claim.length < 10}
        class="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:-translate-y-0.5 disabled:transform-none"
      >
        {#if loading}
          <span class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing claim...
          </span>
        {:else}
          <span class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Fact Check This Claim
          </span>
        {/if}
      </button>
    </div>

    <!-- Error Display -->
    {#if error}
      <div class="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 sm:p-6 mb-6 shadow-md">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-semibold text-red-800">Error</h3>
            <p class="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Results Display -->
    {#if result}
      <div class="space-y-6">
        <!-- Verdict Card -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div class={`p-4 sm:p-6 border-b-4 ${getVerdictColor(result.verdict)}`}>
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center space-x-4">
                <div class={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold border-2 ${getVerdictColor(result.verdict)}`}>
                  {getVerdictIcon(result.verdict)}
                </div>
                <div>
                  <h2 class="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Verdict</h2>
                  <p class="text-xl sm:text-2xl font-bold mt-1">{result.verdict}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Analysis -->
          {#if result.summary && result.summary.length > 0}
            <div class="p-4 sm:p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Analysis
              </h3>
              <div class="space-y-3 sm:space-y-4">
                {#each result.summary as point, index}
                  <div class="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors">
                    <div class="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <p class="text-sm sm:text-base text-gray-700 leading-relaxed flex-1">{point}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Sources -->
          {#if result.sources && result.sources.length > 0}
            <div class="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Sources Referenced
              </h3>
              <div class="space-y-3">
                {#each result.sources as source}
                  <div class="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-indigo-600 hover:text-indigo-800 font-medium hover:underline inline-flex items-center group text-sm sm:text-base"
                    >
                      <span class="break-words">{source.title}</span>
                      <svg class="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <p class="text-xs sm:text-sm text-gray-600 mt-1">{source.publisher} • {source.year}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Disclaimer -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs sm:text-sm text-blue-800">
          <p class="flex items-start">
            <svg class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This fact-check is based on authoritative sources available at the time of verification. Claims are evaluated using official government data, peer-reviewed research, and reputable institutions.</span>
          </p>
        </div>
      </div>
    {/if}

    <!-- Empty State -->
    {#if !result && !loading && !error}
      <div class="text-center py-12">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
          <svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Ready to fact-check</h3>
        <p class="text-sm sm:text-base text-gray-600 max-w-md mx-auto px-4">
          Enter any claim above and we'll verify it against authoritative sources including government data, academic research, and official statistics.
        </p>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-12">
    <div class="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <p class="text-center text-xs sm:text-sm text-gray-600">
        Sources include U.S. government agencies, peer-reviewed research, and authoritative institutions
      </p>
    </div>
  </div>
</div>
