# FlowKit reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool is one FlowKit call.
- Start with inspect_fcs. Report the event count, the channel names and whether the file has a spill matrix.
- Pass the path of the FCS file to each tool. The tools keep no state.
- Answer every part of the request. Call the next tool instead of ending a turn with a plan.
- Plots are PNG files. Show the file names.

## Decisions

- The scientist chooses the compensation matrix, the transform with T, W, M and A, the gating file or workspace, and the control sample. Do not choose them. The harness asks for each value.
- Do not ask for decision values in your own words. Do not suggest values in a question.
- If the scientist gives no control sample, do not call any sample a control.

## Compensation

- Report where the matrix came from: the gating file, the FCS file, a CSV file or none. Name the file.
- Compensation is applied before the transform.
- Compensation can give negative values. Many negative events can mean a wrong matrix. Do not remove them.
- Gates in a file or a workspace were drawn on data that had the matrix of that file. Counts with compensation none are not comparable to the reference.
- Run compare_compensation to answer what changes without compensation. Count_gates keeps the compensation that the scientist chose, even if you pass another value.
- Show the count with and without compensation before you state a count that depends on it.

## Gates and counts

- Report each count with its gate name, its parent gate and the percent of the parent.
- A gate name can occur twice in a workspace (for example CD107a+ under CD4+ and under CD8+). Use the parent path.
- A GatingML file and a workspace carry their own transforms. Gate limits are in the transformed space.
- For a hand gate, report the channels, the limits, the compensation and the transform with T, W, M and A. The limits mean nothing without the transform.
- FlowKit counts for a FlowJo workspace can differ from the counts that FlowJo stored. Report both counts. Do not call them identical.

## Controls and claims

- Name the control file and say why it is the control.
- One control and one sample do not show a difference between groups. Do not claim one.
- A count of events is not a count of cells. Doublets, debris and dead cells stay in the count until a gate removes them.
- Small counts have a large relative error. A gate with 4 events has a 50 percent error from counting alone.

## Report

- Give each number with the tool step that made it.
- Say which results hold at every setting that you tried, and which depend on one setting.
