import express from 'express';
import Task from '../models/Task.js';
import { buildTaskFilter } from '../utils/taskFilters.js';
import { buildTaskPayload } from '../utils/taskPayload.js';
import { tasksToCsv } from '../utils/csv.js';

const router = express.Router();

router.get('/export.csv', async (req, res) => {
  const filter = buildTaskFilter(req.query);
  const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
  const csv = tasksToCsv(tasks);
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${date}.csv"`);
  res.send(csv);
});

router.get('/', async (req, res) => {
  const filter = buildTaskFilter(req.query);
  const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
  res.json(tasks);
});

router.post('/', async (req, res) => {
  const task = await Task.create(buildTaskPayload(req.body));
  res.status(201).json(task);
});

router.get('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id).lean();
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  res.json(task);
});

router.patch('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  task.set(buildTaskPayload(req.body, { partial: true }));
  await task.save();
  res.json(task);
});

router.put('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  const payload = buildTaskPayload(req.body);
  task.set({
    ...payload,
    googleDocLink: payload.googleDocLink ?? '',
    frameIoLink: payload.frameIoLink ?? '',
    description: payload.description ?? '',
    notes: payload.notes ?? '',
    status: payload.status ?? 'Todo',
    priority: payload.priority ?? 'medium',
    pinned: payload.pinned ?? false,
    editorNames: payload.editorNames ?? (payload.editorName ? [payload.editorName] : []),
    editorName: payload.editorName ?? payload.editorNames?.[0] ?? '',
    customFields: payload.customFields ?? [],
  });
  await task.save();
  res.json(task);
});

router.delete('/:id', async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  res.status(204).send();
});

export default router;
