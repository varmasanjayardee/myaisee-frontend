"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { AlertTriangleIcon, MailIcon, PhoneIcon, PlusIcon, SearchIcon, UserPlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stepLabel } from "@/lib/admission";
import { useLeads, useOptions } from "@/services/admission.service";
import { EnquiryForm } from "./enquiry-form";
import { SideDrawer } from "./side-drawer";
import { DataPagination, DEFAULT_PAGE_SIZE } from "./data-pagination";
import { Avatar, Card, EmptyState, PageHeader, PillTabs, RefreshBar, Select, SkeletonRows } from "./ui";

const TABS = [
  { value: "", label: "All" },
  { value: "new", label: "No child added yet" },
  { value: "in_progress", label: "Applying" },
];

/** Every enquiry, including families who haven't started an application */
export function Leads() {
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [adding, setAdding] = useState(false);
  const options = useOptions();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const q = useDeferredValue(query.trim());
  const leads = useLeads({ q, status, channel, page, page_size: pageSize });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Enquiries"
        subtitle={leads.data ? `${leads.data.count} families have enquired` : "Families who have been in touch"}
        actions={
          <Button onClick={() => setAdding(true)} className="shadow-xs">
            <PlusIcon />
            New enquiry
          </Button>
        }
      />

      <PillTabs
        id="lead-tab"
        label="Enquiry status"
        tabs={TABS}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <label className="relative block min-w-0 flex-1 basis-60 sm:max-w-md">
            <span className="sr-only">Search enquiries</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search parent, phone or email"
              className="h-9 w-full rounded-lg border bg-background pr-8 pl-9 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            )}
          </label>
          <Select
            label="Channel"
            value={channel}
            onChange={(v) => {
              setChannel(v);
              setPage(1);
            }}
            options={[{ value: "", label: "All" }, ...(options.data?.channels ?? [])]}
          />
        </div>

        <RefreshBar active={leads.isFetching && !leads.isLoading} />

        {leads.isLoading ? (
          <SkeletonRows columns={4} />
        ) : leads.isError ? (
          <EmptyState icon={AlertTriangleIcon} title="Enquiries didn't load">
            {leads.error.message}
          </EmptyState>
        ) : !leads.data?.results.length ? (
          <EmptyState icon={UserPlusIcon} title={q ? `Nothing matches "${q}"` : "No enquiries here"}>
            New enquiries from the website appear here.
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Parent</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Contact</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Applying for</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Channel</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Children</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Enquired</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.data.results.map((lead) => (
                    <tr key={lead.id} className="align-top transition-colors hover:bg-brand/[0.04]">
                      <td className="px-5 py-3.5">
                        <Link href={`/admission/leads/${lead.id}`} className="group flex items-center gap-3 outline-none">
                          <Avatar name={lead.parent} />
                          <span className="min-w-0">
                            <span className="block font-medium group-hover:text-brand group-focus-visible:underline">{lead.parent}</span>
                            {lead.message && <span className="block max-w-56 truncate text-xs text-muted-foreground italic">“{lead.message}”</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5">
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 tabular-nums hover:text-brand">
                          <PhoneIcon className="size-3.5 text-muted-foreground" />
                          {lead.phone}
                        </a>
                        <a href={`mailto:${lead.email}`} className="mt-0.5 flex max-w-56 items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-brand">
                          <MailIcon className="size-3.5 shrink-0" />
                          {lead.email}
                        </a>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="block">{[lead.grade, lead.academic_year].filter(Boolean).join(", ") || lead.enquiry_type}</span>
                        <span className="block text-xs text-muted-foreground">{lead.campus || "—"}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">{lead.channel_label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {lead.created_by ? `Added by ${lead.created_by}` : lead.source ? `via ${lead.source}` : "Website form"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        {lead.children_count ? (
                          <>
                            <span className="block">
                              {lead.children_count} child{lead.children_count === 1 ? "" : "ren"}
                            </span>
                            <span className="block text-xs text-muted-foreground">Furthest: {stepLabel(lead.furthest_step ?? 1).toLowerCase()}</span>
                          </>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900">
                            Not started
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNowStrict(parseISO(lead.created_at), { addSuffix: true })}
                        {lead.email_status === "failed" && <span className="mt-0.5 block font-medium text-red-600">Welcome email failed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataPagination
              noun="enquiries"
              page={page}
              pageSize={pageSize}
              count={leads.data.count}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      <SideDrawer
        open={adding}
        onOpenChange={setAdding}
        title="New enquiry"
        description="Capture a family who called, walked in or met us at an event."
      >
        {adding && <EnquiryForm onDone={() => setAdding(false)} />}
      </SideDrawer>
    </div>
  );
}
