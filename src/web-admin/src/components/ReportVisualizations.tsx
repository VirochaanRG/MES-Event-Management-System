import { Bar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useEffect, useRef } from "react";
import FileSaver from "file-saver";
import cloud from "d3-cloud";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function BarChartExport({
  data,
  options,
  filename,
}: {
  data: any;
  options?: any;
  filename: string;
}) {
  const chartRef = useRef<any>(null);

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      FileSaver.saveAs(url, filename);
    }
  };

  return (
    <div>
      <Bar ref={chartRef} data={data} options={options} />
      <button
        onClick={handleExport}
        className="mt-2 px-4 py-2 bg-stone-800 text-white"
      >
        Download Chart
      </button>
    </div>
  );
}

export function HistogramExport({
  data,
  options,
  filename,
}: {
  data: any;
  options?: any;
  filename: string;
}) {
  return <BarChartExport data={data} options={options} filename={filename} />;
}

export function WordCloudExport({
  words,
  filename,
}: {
  words: { text: string; value: number }[];
  filename: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const layout = cloud()
      .size([400, 200])
      .words(words.map((d) => ({ text: d.text, size: 10 + d.value * 2 })))
      .padding(5)
      .rotate(() => 0)
      .font("Impact")
      .fontSize((d) => d.size)
      .on("end", (drawWords) => {
        const ctx = canvasRef.current!.getContext("2d");
        ctx!.clearRect(0, 0, 400, 200);
        drawWords.forEach((word: any) => {
          ctx!.font = `${word.size}px Impact`;
          ctx!.fillStyle = "#b91c1c";
          ctx!.fillText(word.text, word.x + 200, word.y + 100);
        });
      });
    layout.start();
  }, [words]);

  const handleExport = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) FileSaver.saveAs(blob, filename);
      });
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        style={{ border: "1px solid #ccc" }}
      />
      <button
        onClick={handleExport}
        className="mt-2 px-4 py-2 bg-stone-800 text-white"
      >
        Download Word Cloud
      </button>
    </div>
  );
}
