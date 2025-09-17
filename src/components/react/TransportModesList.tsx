import { useState, useEffect } from "react";
import { LivingLabTransportModeForm } from "./form/LivingLabTransportModeForm";
import {
  type ITransportMode,
  type IIKpiResultBeforeAfter,
  type IKpi,
  type ILivingLabTransportMode,
} from "../../types";
import { BeforeAndAfterDates } from "./form";
import LivingLabKpiResultsForm from "./form/LivingLabKpiResultsForm";
import { TransportTypeBadge } from "./TransportTypeBadge";
import {
  Table,
  TableHead,
  TableCell,
  TableHeader,
  TableRow,
} from "../react-catalyst-ui-kit";
import { Badge } from "./ui";
import { getKpiValueByMetricType } from "../../lib/helpers";

interface Props {
  modes: ITransportMode[];
  kpis: IKpi[];
  livingLabId: number;
  livingLabTransportModes: ILivingLabTransportMode[];
  kpiResults: IIKpiResultBeforeAfter[];
}

export function TransportModesList({
  modes = [],
  kpis = [],
  livingLabId,
  livingLabTransportModes = [],
  kpiResults = [],
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [beforeDate, setBeforeDate] = useState<string>(today);
  const [afterDate, setAfterDate] = useState<string>(today);

  const [livingLabTransportModesMap, setLivingLabTransportModesMap] = useState<
    Map<number, ILivingLabTransportMode>
  >(
    new Map(
      livingLabTransportModes.map((mode) => [mode.transport_mode_id, mode])
    )
  );

  const [livingLabKpiMap] = useState<Map<string, IIKpiResultBeforeAfter>>(
    new Map(
      kpiResults.map((resultKpi) => [
        `${resultKpi.id}_${resultKpi.result_before?.transport_mode_id}`,
        resultKpi,
      ])
    )
  );
  // totals per KPI id: { before: number, after: number }
  const [kpiTotals, setKpiTotals] = useState<
    Map<number, { before: number; after: number }>
  >(new Map());

  // compute initial totals on mount from kpis + kpiResults
  useEffect(() => {
    const totals = new Map<number, { before: number; after: number }>();
    kpis.forEach((kpi) => {
      let beforeSum = 0;
      let afterSum = 0;
      kpiResults.forEach((r) => {
        if (r.id !== kpi.id) return;
        const b = r.result_before?.value;
        const a = r.result_after?.value;
        const bn = typeof b === "number" ? b : Number(b ?? 0);
        const an = typeof a === "number" ? a : Number(a ?? 0);
        if (!isNaN(bn)) beforeSum += bn;
        if (!isNaN(an)) afterSum += an;
      });
      totals.set(kpi.id, { before: beforeSum, after: afterSum });
    });
    setKpiTotals(totals);
    // run only on mount as requested
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white shadow rounded-md">
      <BeforeAndAfterDates
        onChangeBeforeDate={setBeforeDate}
        onChangeAfterDate={setAfterDate}
      />

      <div className="p-4 overflow-x-auto">
        <Table
          grid
          dense
          striped
          className="[--gutter:--spacing(6)] sm:[--gutter:--spacing(8)]"
        >
          <TableHead>
            <TableRow>
              <TableHeader className="whitespace-normal break-words">
                Name
              </TableHeader>
              <TableHeader className="whitespace-normal break-words">
                Status
              </TableHeader>
              {kpis.map((kpi) => (
                <TableHeader
                  key={kpi.id}
                  className="font-extrabold whitespace-normal break-words text-primary"
                >
                  <div className="flex flex-col">
                    {kpi.name}
                    <span className="text-sm font-normal text-gray-500 flex flex-row justify-between w-full">
                      <span className="text-left">
                        {!!kpiTotals.get(kpi.id)?.before &&
                          getKpiValueByMetricType(
                            kpiTotals.get(kpi.id)?.before,
                            kpi.metric
                          )}
                      </span>
                      <span className="text-right">
                        {!!kpiTotals.get(kpi.id)?.after &&
                          getKpiValueByMetricType(
                            kpiTotals.get(kpi.id)?.after,
                            kpi.metric
                          )}
                      </span>
                    </span>
                  </div>
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <tbody className="bg-white divide-y divide-gray-100 content-start">
            {modes.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="max-w-52 content-start items-start">
                  <label className="whitespace-normal break-words  flex flex-row">
                    {m.name}
                    <Badge color="light" size="sm" tooltip={m.description} />
                  </label>
                  {m.type === "NSM" && <TransportTypeBadge type={m.type} />}
                </TableCell>
                <TableCell className="content-start">
                  <LivingLabTransportModeForm
                    value={livingLabTransportModesMap.get(m.id)}
                    transportModeId={m.id}
                    livingLabId={livingLabId}
                    onChange={(result) => {
                      setLivingLabTransportModesMap((prevMap) => {
                        const updatedMap = new Map(prevMap);
                        const prevValue = prevMap.get(m.id);

                        updatedMap.set(m.id, {
                          ...prevValue,
                          ...result,
                        });
                        return updatedMap;
                      });
                    }}
                  />
                </TableCell>
                {livingLabTransportModesMap.get(m.id)?.status &&
                  kpis.map((kpi) => (
                    <TableCell key={kpi.id} className="content-start">
                      <div className="flex flex-row">
                        <LivingLabKpiResultsForm
                          transportModeId={m.id}
                          livingLabId={livingLabId}
                          kpiId={kpi.id}
                          kpiMetric={kpi.metric}
                          initialBefore={
                            livingLabKpiMap.get(`${kpi.id}_${m.id}`)
                              ?.result_before
                          }
                          initialAfter={
                            livingLabKpiMap.get(`${kpi.id}_${m.id}`)
                              ?.result_after
                          }
                          defaultBeforeDate={beforeDate}
                          defaultAfterDate={afterDate}
                          onChange={(before, after) => {
                            const key = `${kpi.id}_${m.id}`;
                            // previous entry for this KPI+mode
                            const prevEntry = livingLabKpiMap.get(key);
                            const prevBefore =
                              prevEntry?.result_before?.value ?? null;
                            const prevAfter =
                              prevEntry?.result_after?.value ?? null;

                            // compute deltas (treat null as 0 for totals adjustment)
                            const deltaBefore =
                              (before ?? 0) - (prevBefore ?? 0);
                            const deltaAfter = (after ?? 0) - (prevAfter ?? 0);

                            // update totals for this KPI
                            setKpiTotals((prev) => {
                              const updated = new Map(prev);
                              const existingTotals = updated.get(kpi.id) ?? {
                                before: 0,
                                after: 0,
                              };
                              existingTotals.before =
                                (existingTotals.before ?? 0) + deltaBefore;
                              existingTotals.after =
                                (existingTotals.after ?? 0) + deltaAfter;
                              updated.set(kpi.id, existingTotals);
                              return updated;
                            });
                          }}
                        />
                      </div>
                    </TableCell>
                  ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
