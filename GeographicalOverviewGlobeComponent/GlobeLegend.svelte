<script>
    // Accept dynamic legend data from parent
    export let legendItems = [
        { label: "0", color: "#F2F2EF" },
        { label: "1-20", color: "#C4D2E3" },
        { label: "21-40", color: "#929FA9" },
        { label: "41-60", color: "#516575" },
        { label: "61-80", color: "#3B5264" },
        { label: "81-100", color: "#253F53" },
        { label: ">100", color: "#162632" },
    ];

    const disclaimerText = `Disclaimer: This map is for data reference purposes only and does not imply a position on or recognition of boundaries or sovereignty.`;
</script>

<div class="flex flex-col gap-4 px-5 py-4 ">
    <div
        class="relative bg-[rgba(59,82,100,0.9)] rounded-lg backdrop-blur-[10px] w-fit"
    >
        <div
            class="text-white text-[14px] font-whitney-book font-medium leading-[100%] whitespace-nowrap mb-6"
        >
            N. of PDBs tracked per country
        </div>
        <div class="flex items-center gap-2">
            {#each legendItems as item, index}
                <div class="flex flex-col items-center gap-4">
                    <div
                        class="text-white text-[14px] font-whitney-book font-medium leading-[100%] whitespace-nowrap"
                    >
                        {item.label}
                    </div>
                    <div
                        class="w-9 h-4 border-0"
                        style="background-color: {item.color}; {index >= 3
                            ? 'border: 0.5px solid white;'
                            : ''}"
                    ></div>
                </div>
            {/each}
        </div>
    </div>
    <div
        class="text-white text-[12px] font-whitney-book leading-[140%] max-w-[600px]"
    >
        {disclaimerText}
    </div>
</div>
