
import { useMemo } from 'react';

interface UseVirtualListProps {
  itemCount: number;
  getItemSize: (index: number) => number;
  containerSize: number;
  scrollOffset: number;
  overscan?: number;
}

export interface VirtualItem {
  index: number;
  offset: number;
  size: number;
}

const binarySearch = (offsets: number[], target: number): number => {
    let low = 0;
    let high = offsets.length - 1;
    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        const current = offsets[mid];
        if (current === target) {
            return mid;
        } else if (current < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    // `high` will be the index of the last item whose offset is less than or equal to the target
    return Math.max(0, high);
};

export const useVirtualList = ({
  itemCount,
  getItemSize,
  containerSize,
  scrollOffset,
  overscan = 5,
}: UseVirtualListProps) => {
  const { offsets, totalSize } = useMemo(() => {
    const newOffsets = [0];
    let currentTotal = 0;
    for (let i = 0; i < itemCount; i++) {
      currentTotal += getItemSize(i);
      newOffsets.push(currentTotal);
    }
    return { offsets: newOffsets, totalSize: currentTotal };
  }, [itemCount, getItemSize]);

  const startIndex = useMemo(() => 
    Math.max(0, binarySearch(offsets, scrollOffset) - overscan),
    [offsets, scrollOffset, overscan]
  );
  
  const endIndex = useMemo(() => {
    const endOffset = scrollOffset + containerSize;
    let end = binarySearch(offsets, endOffset);
    if(end < itemCount) end++; // ensure the item at the end offset is included
    return Math.min(itemCount - 1, end + overscan);
  }, [offsets, scrollOffset, containerSize, overscan, itemCount]);

  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    if (startIndex > endIndex) return items;
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offset: offsets[i],
        size: getItemSize(i),
      });
    }
    return items;
  }, [startIndex, endIndex, offsets, getItemSize]);

  return {
    virtualItems,
    totalSize,
    offsets,
  };
};
