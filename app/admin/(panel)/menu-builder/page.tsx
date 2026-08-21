'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Layers, ShoppingBag, Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMenuBuilder, useUpdateMenuOrder } from '@/lib/hooks/useMenuBuilder'
import { useBrands } from '@/lib/hooks/useCategories'

export default function MenuBuilderPage() {
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const brandFilter = selectedBrand === 'all' ? undefined : selectedBrand
  const { data: menuItems, isLoading } = useMenuBuilder(brandFilter)
  const { data: brands } = useBrands()
  const updateOrder = useUpdateMenuOrder()

  const [items, setItems] = useState(menuItems || [])
  const [hasChanges, setHasChanges] = useState(false)

  // Update local items when data changes
  if (menuItems && items.length === 0 && !hasChanges) {
    setItems(menuItems)
  }

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const newItems = Array.from(items)
    const [reorderedItem] = newItems.splice(result.source.index, 1)
    newItems.splice(result.destination.index, 0, reorderedItem)

    // Update sort_order
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }))

    setItems(updatedItems)
    setHasChanges(true)
  }, [items])

  const handleSave = async () => {
    const orderUpdates = items.map((item) => ({
      id: item.id,
      type: item.type,
      sort_order: item.sort_order,
    }))

    await updateOrder.mutateAsync({ items: orderUpdates })
    setHasChanges(false)
  }

  const handleReset = () => {
    if (menuItems) {
      setItems(menuItems)
      setHasChanges(false)
    }
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">منشئ القائمة</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            اسحب وأسقط لترتيب الفئات والمنتجات
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="ml-2 h-4 w-4" />
              إعادة
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateOrder.isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Save className="ml-2 h-4 w-4" />
            {updateOrder.isPending ? 'جاري الحفظ...' : 'حفظ الترتيب'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Brand Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium">تصفية حسب البرانده:</span>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="كل البراندات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🍽️ كل البراندات</SelectItem>
            {brands?.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                <span
                  className="inline-block w-3 h-3 rounded-full ml-2"
                  style={{ backgroundColor: brand.primary_color ?? '#888' }}
                />
                {brand.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drag & Drop List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="menu-items">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        flex items-center gap-3 p-4 rounded-lg border bg-white
                        transition-shadow hover:shadow-sm
                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-200' : ''}
                        ${item.type === 'category' ? 'border-r-4 border-r-orange-500' : 'border-r-4 border-r-blue-400'}
                      `}
                      style={provided.draggableProps.style as React.CSSProperties}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-400"
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>

                      <div className="flex items-center gap-2">
                        {item.type === 'category' ? (
                          <Layers className="h-5 w-5 text-orange-500" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-blue-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.name_ar}</p>
                          <Badge variant={item.type === 'category' ? 'default' : 'secondary'} className="text-xs">
                            {item.type === 'category' ? 'فئة' : 'منتج'}
                          </Badge>
                          {item.status !== 'active' && (
                            <Badge variant="outline" className="text-xs text-gray-500 dark:text-gray-400">
                              {item.status === 'draft' ? 'مسودة' : 'متوقف'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{item.name_en}</p>
                        {item.base_price && (
                          <p className="text-sm text-orange-600 font-medium">{item.base_price} ج.م</p>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        #{item.sort_order}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {(!items || items.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">لا توجد عناصر</p>
          <p className="text-sm">أضف فئات ومنتجات أولاً</p>
        </div>
      )}
    </div>
  )
}