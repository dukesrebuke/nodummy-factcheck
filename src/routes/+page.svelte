<script lang="ts">
  let claim = "";
  let result: any = null;
  let loading = false;

  async function submit() {
    loading = true;
    result = null;

    const res = await fetch("/.netlify/functions/analyzeClaim", {
      method: "POST",
      body: JSON.stringify({ claim }),
    });

    result = await res.json();
    loading = false;
  }
</script>

<h1 class="text-3xl font-bold mb-4">Fact Check a Claim</h1>

<textarea
  bind:value={claim}
  class="w-full p-3 border mb-4"
  rows="4"
  placeholder="Paste a claim here..."
></textarea>

<button
  on:click={submit}
  class="px-4 py-2 bg-black text-white"
  disabled={loading}
>
  {loading ? "Checking…" : "Check Claim"}
</button>

{#if result}
  <div class="mt-6">
    <h2 class="text-xl font-semibold">Verdict: {result.verdict}</h2>
    <ul class="list-disc ml-6 mt-2">
      {#each result.summary as point}
        <li>{point}</li>
      {/each}
    </ul>
  </div>
{/if}
